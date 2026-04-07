const { MATCH_THRESHOLDS, CRITICAL_KEYWORDS } = require("./constants");
const { EmbeddingService } = require("./embeddingService");
const { cosineSimilarity, round, splitToBullets, tokenize, unique } = require("./utils");
const { logDebug } = require("./debugLogger");

const embeddingService = new EmbeddingService();

const isCriticalRequirement = (text) => {
  const lower = String(text || "").toLowerCase();
  return CRITICAL_KEYWORDS.some((keyword) => lower.includes(keyword));
};

const buildRequirementItems = (rfpExtraction) => {
  const items = [];

  (rfpExtraction.functional_requirements || []).forEach((requirement) => {
    items.push({ category: "functional", requirement });
  });

  (rfpExtraction.technical_requirements || []).forEach((requirement) => {
    items.push({ category: "technical", requirement });
  });

  (rfpExtraction.compliance_requirements || []).forEach((requirement) => {
    items.push({ category: "compliance", requirement });
  });

  (rfpExtraction.evaluation_criteria || []).forEach((requirement) => {
    items.push({ category: "compliance", requirement });
  });

  if (rfpExtraction.timeline) {
    items.push({ category: "timeline", requirement: rfpExtraction.timeline });
  }

  return items.map((item) => ({
    ...item,
    critical: isCriticalRequirement(item.requirement),
  }));
};

const buildCandidatePools = (proposalExtraction, proposalText) => {
  const proposalSentences = splitToBullets(proposalText).slice(0, 300);
  const timelineSentences = proposalSentences.filter((sentence) =>
    /(timeline|milestone|delivery|week|month|days)/i.test(sentence)
  );

  return {
    functional: unique([
      ...(proposalExtraction.features || []),
      ...(proposalExtraction.methodology || []),
      ...proposalSentences,
    ]),
    technical: unique([
      ...(proposalExtraction.tech_stack || []),
      ...(proposalExtraction.features || []),
      ...proposalSentences,
    ]),
    compliance: unique([
      ...(proposalExtraction.certifications || []),
      ...(proposalExtraction.methodology || []),
      ...(proposalExtraction.features || []),
      ...proposalSentences,
    ]),
    timeline: unique([
      proposalExtraction.timeline,
      ...timelineSentences,
    ]),
  };
};

const toStatus = (score) => {
  if (score >= MATCH_THRESHOLDS.full) {
    return "full";
  }

  if (score >= MATCH_THRESHOLDS.partial) {
    return "partial";
  }

  return "missing";
};

const extractDuration = (text) => {
  const lower = String(text || "").toLowerCase();
  const match = lower.match(/(\d+)\s*(day|days|week|weeks|month|months)/);
  if (!match) {
    return null;
  }

  const value = Number(match[1]);
  const unit = match[2];
  return { value, unit };
};

const sameCertificationMention = (requirement, candidate) => {
  const certTokens = ["iso", "soc2", "gdpr", "hipaa", "pci", "certification", "certificate"];
  const reqLower = String(requirement || "").toLowerCase();
  const candLower = String(candidate || "").toLowerCase();
  return certTokens.some((token) => reqLower.includes(token) && candLower.includes(token));
};

const categoryAwareAdjustment = (category, requirement, candidate, score) => {
  const reqLower = String(requirement || "").toLowerCase();
  const candLower = String(candidate || "").toLowerCase();
  let adjusted = score;

  if (category === "timeline") {
    const reqDuration = extractDuration(requirement);
    const candDuration = extractDuration(candidate);

    if (reqDuration && candDuration && reqDuration.unit.startsWith(candDuration.unit.slice(0, 3))) {
      const relativeGap = Math.abs(reqDuration.value - candDuration.value) / Math.max(reqDuration.value, 1);
      if (relativeGap <= 0.25) {
        adjusted = Math.max(adjusted, 0.78);
      } else if (relativeGap <= 0.5) {
        adjusted = Math.max(adjusted, 0.62);
      } else {
        adjusted = Math.max(adjusted, 0.45);
      }
    } else if (/(timeline|milestone|delivery|rollout)/.test(reqLower) && /(timeline|milestone|delivery|rollout)/.test(candLower)) {
      adjusted = Math.max(adjusted, 0.5);
    }
  }

  if (category === "compliance" && sameCertificationMention(requirement, candidate)) {
    adjusted = Math.max(adjusted, 0.78);
  }

  if (category === "technical") {
    const hasApi = reqLower.includes("api") && candLower.includes("api");
    const hasPerfSignal =
      /(latency|response|throughput|performance|ms)/.test(reqLower) &&
      /(latency|response|throughput|performance|ms)/.test(candLower);

    if (hasApi && hasPerfSignal) {
      adjusted = Math.max(adjusted, 0.68);
    }
  }

  return adjusted;
};

const lexicalOverlapScore = (requirement, candidate) => {
  const reqTokens = tokenize(requirement);
  const candTokens = tokenize(candidate);

  if (!reqTokens.length || !candTokens.length) {
    return 0;
  }

  const reqSet = new Set(reqTokens);
  const candSet = new Set(candTokens);

  let intersection = 0;
  reqSet.forEach((token) => {
    if (candSet.has(token)) {
      intersection += 1;
    }
  });

  const requirementCoverage = reqSet.size ? intersection / reqSet.size : 0;
  const phraseBonus = intersection >= 3 ? 0.12 : 0;

  return Math.min(1, requirementCoverage + phraseBonus);
};

const hasExactKeywordBoost = (requirement, matchedText) => {
  const requirementTokens = new Set(tokenize(requirement));
  const matchedTokens = tokenize(matchedText);
  const overlap = matchedTokens.filter((token) => requirementTokens.has(token));

  return overlap.length >= 2;
};

const matchRequirements = async ({ rfpExtraction, proposalExtraction, proposalText, requestId }) => {
  const requirements = buildRequirementItems(rfpExtraction);
  const pools = buildCandidatePools(proposalExtraction, proposalText);

  if (!requirements.length) {
    return [];
  }

  const allCandidates = unique(
    Object.values(pools).flatMap((items) => (Array.isArray(items) ? items : []))
  );

  const allTexts = unique([...requirements.map((item) => item.requirement), ...allCandidates]);
  const allEmbeddings = await embeddingService.embedMany(allTexts, requestId);
  const embeddingByText = new Map();

  allTexts.forEach((text, index) => {
    embeddingByText.set(text, allEmbeddings[index]);
  });

  const matches = requirements.map((item) => {
    const candidates = pools[item.category] || [];
    if (!candidates.length) {
      return {
        category: item.category,
        requirement: item.requirement,
        match_score: 0,
        matched_text: "",
        status: "missing",
        critical: item.critical,
        exact_keyword_hit: false,
      };
    }

    const requirementVector = embeddingByText.get(item.requirement) || [];

    let bestScore = Number.NEGATIVE_INFINITY;
    let bestText = "";

    candidates.forEach((candidate) => {
      const candidateVector = embeddingByText.get(candidate) || [];
      const semanticScore = cosineSimilarity(requirementVector, candidateVector);
      const lexicalScore = lexicalOverlapScore(item.requirement, candidate);
      const score = semanticScore * 0.4 + lexicalScore * 0.6;
      if (score > bestScore) {
        bestScore = score;
        bestText = candidate;
      }
    });

    const baselineScore = Number.isFinite(bestScore) ? Math.max(0, bestScore) : 0;
    const adjustedScore = categoryAwareAdjustment(item.category, item.requirement, bestText, baselineScore);
    const exactKeywordHit = hasExactKeywordBoost(item.requirement, bestText);
    const boostedScore = exactKeywordHit ? Math.min(1, adjustedScore + 0.08) : adjustedScore;

    return {
      category: item.category,
      requirement: item.requirement,
      match_score: round(boostedScore, 4),
      matched_text: bestText,
      status: toStatus(boostedScore),
      critical: item.critical,
      exact_keyword_hit: exactKeywordHit,
    };
  });

  logDebug(requestId, "requirement_matches", matches);
  return matches;
};

module.exports = {
  matchRequirements,
};
