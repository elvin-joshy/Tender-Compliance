const OpenAI = require("openai");
const { logDebug } = require("./debugLogger");
const { normalizeText, tokenize } = require("./utils");

const EMBEDDING_DIMENSION = Number(process.env.LOCAL_EMBEDDING_DIMENSION || 256);
const OPENAI_EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

let cachedOpenAiClient = null;

const getOpenAiClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  if (!cachedOpenAiClient) {
    cachedOpenAiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  return cachedOpenAiClient;
};

const hashToken = (token) => {
  let hash = 0;
  for (let index = 0; index < token.length; index += 1) {
    hash = (hash << 5) - hash + token.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

const normalizeVector = (vector) => {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!magnitude) {
    return vector;
  }

  return vector.map((value) => value / magnitude);
};

const localEmbedding = (text) => {
  const tokens = tokenize(text);
  const vector = new Array(EMBEDDING_DIMENSION).fill(0);

  if (!tokens.length) {
    return vector;
  }

  const counts = new Map();
  tokens.forEach((token) => counts.set(token, (counts.get(token) || 0) + 1));

  for (const [token, count] of counts.entries()) {
    const hash = hashToken(token);
    const index = hash % EMBEDDING_DIMENSION;
    const signedWeight = hash % 2 === 0 ? count : -count;
    vector[index] += signedWeight;
  }

  return normalizeVector(vector);
};

class EmbeddingService {
  constructor() {
    this.cache = new Map();
    this.providerName = (process.env.EMBEDDING_PROVIDER || "auto").toLowerCase();
  }

  async embedMany(texts, requestId) {
    const normalizedTexts = texts.map((item) => normalizeText(item));
    const uniqueTexts = Array.from(new Set(normalizedTexts));
    const missing = uniqueTexts.filter((text) => !this.cache.has(text));

    if (missing.length) {
      await this.#computeEmbeddings(missing, requestId);
    }

    return normalizedTexts.map((text) => this.cache.get(text) || localEmbedding(text));
  }

  async #computeEmbeddings(texts, requestId) {
    const canUseOpenAi = this.providerName === "openai" || this.providerName === "auto";
    const client = canUseOpenAi ? getOpenAiClient() : null;

    if (client) {
      try {
        const response = await client.embeddings.create({
          model: OPENAI_EMBEDDING_MODEL,
          input: texts,
        });

        response.data.forEach((item, index) => {
          this.cache.set(texts[index], item.embedding);
        });

        logDebug(requestId, "embedding_provider", {
          provider: "openai",
          model: OPENAI_EMBEDDING_MODEL,
          count: texts.length,
        });

        return;
      } catch (error) {
        logDebug(requestId, "embedding_provider_fallback", {
          provider: "local",
          reason: error.message,
        });
      }
    } else if (this.providerName === "openai") {
      logDebug(requestId, "embedding_provider_fallback", {
        provider: "local",
        reason: "OPENAI_API_KEY is missing while EMBEDDING_PROVIDER=openai",
      });
    }

    texts.forEach((text) => {
      this.cache.set(text, localEmbedding(text));
    });

    logDebug(requestId, "embedding_provider", {
      provider: "local",
      dimension: EMBEDDING_DIMENSION,
      count: texts.length,
    });
  }
}

module.exports = {
  EmbeddingService,
};
