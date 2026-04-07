const crypto = require("crypto");

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const round = (value, decimals = 4) => {
  const factor = 10 ** decimals;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
};

const normalizeText = (text) => String(text || "").replace(/\s+/g, " ").trim();

const tokenize = (text) =>
  normalizeText(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

const unique = (items = []) => Array.from(new Set(items.filter(Boolean)));

const cosineSimilarity = (a = [], b = []) => {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0) {
    return 0;
  }

  const length = Math.min(a.length, b.length);
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let index = 0; index < length; index += 1) {
    const av = Number(a[index]) || 0;
    const bv = Number(b[index]) || 0;
    dot += av * bv;
    magA += av * av;
    magB += bv * bv;
  }

  if (magA === 0 || magB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
};

const splitToBullets = (text) => {
  const raw = String(text || "").replace(/\r/g, "\n").trim();
  if (!raw) {
    return [];
  }

  const lineBased = raw
    .split(/\n+/)
    .map((line) => line.replace(/^[\-\u2022\d.)\s]+/, "").trim())
    .filter(Boolean);

  const sentenceBased = raw
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.replace(/^[\-\u2022\d.)\s]+/, "").trim())
    .filter(Boolean);

  const preferredLineBased = lineBased.length <= 1 && sentenceBased.length > 1 ? [] : lineBased;

  return unique([...preferredLineBased, ...sentenceBased]);
};

const hashToVariance = (seedInput, maxAbsPercent) => {
  const hash = crypto.createHash("sha256").update(String(seedInput || "")).digest("hex");
  const base = parseInt(hash.slice(0, 8), 16);
  const normalized = (base % 10001) / 10000;
  const centered = normalized * 2 - 1;
  return round(centered * maxAbsPercent, 2);
};

module.exports = {
  clamp,
  round,
  normalizeText,
  tokenize,
  unique,
  cosineSimilarity,
  splitToBullets,
  hashToVariance,
};
