const { CATEGORY_WEIGHTS, MAX_VARIANCE_PERCENT } = require("./constants");
const { clamp, hashToVariance, round } = require("./utils");
const { logDebug } = require("./debugLogger");

const STATUS_TO_SCORE = {
  full: 1,
  partial: 0.6,
  missing: 0,
};

const categories = ["functional", "technical", "compliance", "timeline"];

const mean = (values) => {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const scoreMatches = ({ matches, rfpText, proposalText, requestId }) => {
  const categoryScoresNormalized = {};

  categories.forEach((category) => {
    const categoryMatches = matches.filter((match) => match.category === category);
    const numericScores = categoryMatches.map((match) => {
      if (typeof match.match_score === "number") {
        return match.match_score;
      }
      return STATUS_TO_SCORE[match.status] ?? 0;
    });

    categoryScoresNormalized[category] = mean(numericScores);
  });

  const weightedBase = categories.reduce((sum, category) => {
    return sum + categoryScoresNormalized[category] * CATEGORY_WEIGHTS[category];
  }, 0);

  const criticalMissingCount = matches.filter((match) => match.critical && match.status === "missing").length;
  const criticalPartialCount = matches.filter((match) => match.critical && match.status === "partial").length;
  const exactRewardCount = matches.filter((match) => match.exact_keyword_hit && match.status === "full").length;

  const criticalPenalty = Math.min(25, criticalMissingCount * 6 + criticalPartialCount * 2);
  const exactReward = Math.min(8, exactRewardCount * 1.25);
  const varianceSeed = `${rfpText}|${proposalText}|${matches.length}`;
  const variance = hashToVariance(varianceSeed, MAX_VARIANCE_PERCENT);

  const finalScore = clamp(round(weightedBase * 100 - criticalPenalty + exactReward + variance, 2), 0, 100);

  const categoryScores = categories.reduce((acc, category) => {
    acc[category] = round(categoryScoresNormalized[category] * 100, 2);
    return acc;
  }, {});

  const scoringBreakdown = {
    weighted_base_score: round(weightedBase * 100, 2),
    critical_missing_penalty: round(criticalPenalty, 2),
    exact_keyword_reward: round(exactReward, 2),
    controlled_variance_adjustment: round(variance, 2),
    final_score: finalScore,
  };

  logDebug(requestId, "category_scores", categoryScores);
  logDebug(requestId, "final_score_breakdown", scoringBreakdown);

  return {
    finalScore,
    categoryScores,
    scoringBreakdown,
  };
};

module.exports = {
  scoreMatches,
};
