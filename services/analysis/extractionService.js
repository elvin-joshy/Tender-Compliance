const OpenAI = require("openai");
const {
  RFP_EXTRACTION_TEMPLATE,
  PROPOSAL_EXTRACTION_TEMPLATE,
} = require("./constants");
const { normalizeText, splitToBullets, tokenize, unique } = require("./utils");
const { logDebug } = require("./debugLogger");

const LLM_PROVIDER = (process.env.LLM_PROVIDER || "auto").toLowerCase();
const GROQ_BASE_URL = process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

let cachedGroqClient = null;
let cachedOpenAiClient = null;

const getGroqClient = () => {
  if (!process.env.GROQ_API_KEY) {
    return null;
  }

  if (!cachedGroqClient) {
    cachedGroqClient = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: GROQ_BASE_URL,
    });
  }

  return cachedGroqClient;
};

const getOpenAiClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  if (!cachedOpenAiClient) {
    cachedOpenAiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  return cachedOpenAiClient;
};

const resolveProviderConfig = () => {
  if (LLM_PROVIDER === "groq") {
    return {
      provider: "groq",
      client: getGroqClient(),
      model: GROQ_MODEL,
    };
  }

  if (LLM_PROVIDER === "openai") {
    return {
      provider: "openai",
      client: getOpenAiClient(),
      model: OPENAI_MODEL,
    };
  }

  if (LLM_PROVIDER === "local") {
    return {
      provider: "local",
      client: null,
      model: "local-heuristic",
    };
  }

  if (process.env.GROQ_API_KEY) {
    return {
      provider: "groq",
      client: getGroqClient(),
      model: GROQ_MODEL,
    };
  }

  if (process.env.OPENAI_API_KEY) {
    return {
      provider: "openai",
      client: getOpenAiClient(),
      model: OPENAI_MODEL,
    };
  }

  return {
    provider: "local",
    client: null,
    model: "local-heuristic",
  };
};

const cloneTemplate = (template) => JSON.parse(JSON.stringify(template));

const normalizeArray = (value, sourceTokens) => {
  if (!Array.isArray(value)) {
    return [];
  }

  const grounded = value
    .map((item) => normalizeText(item))
    .filter(Boolean)
    .filter((item) => {
      const itemTokens = tokenize(item);
      if (itemTokens.length === 0) {
        return false;
      }

      const matchedTokenCount = itemTokens.filter((token) => sourceTokens.has(token)).length;
      return matchedTokenCount >= Math.min(2, itemTokens.length);
    });

  return unique(grounded);
};

const normalizeString = (value, sourceText) => {
  const text = normalizeText(value);
  if (!text) {
    return "";
  }

  const textTokens = tokenize(text);
  const sourceTokens = new Set(tokenize(sourceText));
  const matchedTokenCount = textTokens.filter((token) => sourceTokens.has(token)).length;

  return matchedTokenCount >= Math.min(2, textTokens.length) ? text : "";
};

const sanitizeRfpExtraction = (payload, sourceText) => {
  const normalized = cloneTemplate(RFP_EXTRACTION_TEMPLATE);
  const sourceTokens = new Set(tokenize(sourceText));

  normalized.functional_requirements = normalizeArray(payload.functional_requirements, sourceTokens);
  normalized.technical_requirements = normalizeArray(payload.technical_requirements, sourceTokens);
  normalized.compliance_requirements = normalizeArray(payload.compliance_requirements, sourceTokens);
  normalized.evaluation_criteria = normalizeArray(payload.evaluation_criteria, sourceTokens);
  normalized.timeline = normalizeString(payload.timeline, sourceText);
  normalized.budget = normalizeString(payload.budget, sourceText);

  return normalized;
};

const sanitizeProposalExtraction = (payload, sourceText) => {
  const normalized = cloneTemplate(PROPOSAL_EXTRACTION_TEMPLATE);
  const sourceTokens = new Set(tokenize(sourceText));

  normalized.features = normalizeArray(payload.features, sourceTokens);
  normalized.tech_stack = normalizeArray(payload.tech_stack, sourceTokens);
  normalized.certifications = normalizeArray(payload.certifications, sourceTokens);
  normalized.methodology = normalizeArray(payload.methodology, sourceTokens);
  normalized.timeline = normalizeString(payload.timeline, sourceText);
  normalized.pricing = normalizeString(payload.pricing, sourceText);

  return normalized;
};

const parseJsonSafe = (rawText) => {
  try {
    return JSON.parse(rawText);
  } catch (error) {
    return {};
  }
};

const buildSystemPrompt = (docType) => {
  const schema =
    docType === "rfp"
      ? JSON.stringify(RFP_EXTRACTION_TEMPLATE, null, 2)
      : JSON.stringify(PROPOSAL_EXTRACTION_TEMPLATE, null, 2);

  return [
    "You are an enterprise document extraction engine.",
    "Return only strict JSON. No markdown and no commentary.",
    "Never infer facts not explicitly stated in the source text.",
    "Extract bullet-level items only from explicit statements.",
    "If unknown, return empty arrays or empty strings.",
    `Schema to return: ${schema}`,
  ].join(" ");
};

const extractWithLLM = async (docType, sourceText, requestId) => {
  const { provider, client, model } = resolveProviderConfig();
  if (!client) {
    logDebug(requestId, `${docType}_extraction_provider`, {
      provider,
      model,
      fallback: "heuristic",
    });
    return null;
  }

  const completion = await client.chat.completions.create({
    model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: buildSystemPrompt(docType),
      },
      {
        role: "user",
        content: sourceText.slice(0, 120000),
      },
    ],
  });

  const rawText = completion?.choices?.[0]?.message?.content || "{}";
  const parsed = parseJsonSafe(rawText);

  logDebug(requestId, `${docType}_extraction_provider`, {
    provider,
    model,
  });
  logDebug(requestId, `${docType}_extraction_llm_raw`, parsed);
  return parsed;
};

const classifyRfpBullets = (bullets) => {
  const functional = [];
  const technical = [];
  const compliance = [];
  const evaluation = [];
  let timeline = "";
  let budget = "";

  bullets.forEach((bullet) => {
    const lower = bullet.toLowerCase();

    if (!timeline && /(timeline|milestone|deadline|week|month|days|delivery)/.test(lower)) {
      timeline = bullet;
      return;
    }

    if (!budget && /(budget|cost|price|pricing|usd|inr|eur|amount|fee)/.test(lower)) {
      budget = bullet;
      return;
    }

    if (/(evaluation|criteria|weightage|scoring|scorecard|marks)/.test(lower)) {
      evaluation.push(bullet);
      return;
    }

    if (/(security|compliance|law|regulation|iso|gdpr|certificate|audit|policy)/.test(lower)) {
      compliance.push(bullet);
      return;
    }

    if (/(api|cloud|integration|database|latency|architecture|availability|tech|stack|platform)/.test(lower)) {
      technical.push(bullet);
      return;
    }

    functional.push(bullet);
  });

  return {
    functional_requirements: unique(functional),
    technical_requirements: unique(technical),
    compliance_requirements: unique(compliance),
    timeline,
    budget,
    evaluation_criteria: unique(evaluation),
  };
};

const classifyProposalBullets = (bullets) => {
  const features = [];
  const techStack = [];
  const certifications = [];
  const methodology = [];
  let timeline = "";
  let pricing = "";

  bullets.forEach((bullet) => {
    const lower = bullet.toLowerCase();

    if (!timeline && /(timeline|milestone|week|month|days|delivery|rollout)/.test(lower)) {
      timeline = bullet;
      return;
    }

    if (!pricing && /(pricing|price|cost|usd|inr|eur|fee|commercial)/.test(lower)) {
      pricing = bullet;
      return;
    }

    if (/(iso|soc|certificate|certification|compliance|gdpr|hipaa|audit)/.test(lower)) {
      certifications.push(bullet);
      return;
    }

    if (/(react|node|java|python|aws|azure|gcp|postgres|mongodb|kubernetes|docker|redis|microservice)/.test(lower)) {
      techStack.push(bullet);
      return;
    }

    if (/(methodology|approach|agile|sprint|governance|qa|testing|deployment)/.test(lower)) {
      methodology.push(bullet);
      return;
    }

    features.push(bullet);
  });

  return {
    features: unique(features),
    tech_stack: unique(techStack),
    certifications: unique(certifications),
    timeline,
    pricing,
    methodology: unique(methodology),
  };
};

const extractWithHeuristics = (docType, sourceText) => {
  const bullets = splitToBullets(sourceText).slice(0, 300);

  if (docType === "rfp") {
    return classifyRfpBullets(bullets);
  }

  return classifyProposalBullets(bullets);
};

const extractStructuredRfp = async (rfpText, requestId) => {
  const sourceText = normalizeText(rfpText);
  const llmPayload = await extractWithLLM("rfp", sourceText, requestId).catch(() => null);
  const raw = llmPayload || extractWithHeuristics("rfp", sourceText);
  const sanitized = sanitizeRfpExtraction(raw, sourceText);

  logDebug(requestId, "rfp_extraction_final", sanitized);
  return sanitized;
};

const extractStructuredProposal = async (proposalText, requestId) => {
  const sourceText = normalizeText(proposalText);
  const llmPayload = await extractWithLLM("proposal", sourceText, requestId).catch(() => null);
  const raw = llmPayload || extractWithHeuristics("proposal", sourceText);
  const sanitized = sanitizeProposalExtraction(raw, sourceText);

  logDebug(requestId, "proposal_extraction_final", sanitized);
  return sanitized;
};

module.exports = {
  extractStructuredRfp,
  extractStructuredProposal,
};
