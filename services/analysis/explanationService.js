const { round } = require("./utils");

const buildSuggestion = (item) => {
  if (item.category === "timeline") {
    return "Add explicit delivery milestones and implementation phases aligned to the RFP timeline.";
  }

  if (item.category === "compliance") {
    return "Include explicit compliance evidence such as certifications, audit controls, and policy commitments.";
  }

  if (item.category === "technical") {
    return "Add concrete technical implementation details, architecture specifics, and measurable SLAs.";
  }

  return "Map this requirement to a concrete feature with ownership, deliverables, and measurable outcomes.";
};

const generateExplanation = ({ matches, finalScore, categoryScores, scoringBreakdown }) => {
  const sortedFull = matches
    .filter((item) => item.status === "full")
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, 5);

  const partial = matches
    .filter((item) => item.status === "partial")
    .sort((a, b) => b.match_score - a.match_score);

  const missing = matches.filter((item) => item.status === "missing");

  const strengths = sortedFull.map((item) => ({
    requirement: item.requirement,
    matched_text: item.matched_text,
    match_score: round(item.match_score, 3),
    reason: `Strong ${item.category} alignment with high semantic similarity.`,
  }));

  const missingRequirements = missing.map((item) => ({
    requirement: item.requirement,
    category: item.category,
    critical: item.critical,
    suggestion: buildSuggestion(item),
  }));

  const partialMatches = partial.map((item) => ({
    requirement: item.requirement,
    matched_text: item.matched_text,
    category: item.category,
    match_score: round(item.match_score, 3),
    gap: "Proposal mentions related intent but lacks complete, explicit coverage.",
    suggestion: buildSuggestion(item),
  }));

  const improvementSuggestions = Array.from(
    new Set(
      [...missingRequirements, ...partialMatches]
        .slice(0, 8)
        .map((item) => item.suggestion)
        .filter(Boolean)
    )
  );

  const detailedExplanation = {
    why_score_is_this: `Final score is ${finalScore}% based on weighted category performance with critical-gap penalties and controlled variance for realistic score spread.`,
    scoring_summary: scoringBreakdown,
    category_interpretation: {
      functional: `Functional score ${categoryScores.functional}% reflects business requirement coverage.`,
      technical: `Technical score ${categoryScores.technical}% reflects architecture and stack alignment.`,
      compliance: `Compliance score ${categoryScores.compliance}% reflects regulatory and certification commitments.`,
      timeline: `Timeline score ${categoryScores.timeline}% reflects delivery schedule alignment.`,
    },
    strengths,
    partial_matches: partialMatches,
    missing_requirements: missingRequirements,
    improvement_suggestions: improvementSuggestions,
  };

  return {
    detailedExplanation,
    missingRequirements,
    partialMatches,
  };
};

module.exports = {
  generateExplanation,
};
