const crypto = require("crypto");
const { extractStructuredRfp, extractStructuredProposal } = require("./extractionService");
const { matchRequirements } = require("./matchingEngine");
const { scoreMatches } = require("./scoringService");
const { generateExplanation } = require("./explanationService");
const { logDebug } = require("./debugLogger");

const analyzeTenderCompliance = async ({ rfpText, proposalText, includeDebug = true }) => {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  const [rfpExtraction, proposalExtraction] = await Promise.all([
    extractStructuredRfp(rfpText, requestId),
    extractStructuredProposal(proposalText, requestId),
  ]);

  const matches = await matchRequirements({
    rfpExtraction,
    proposalExtraction,
    proposalText,
    requestId,
  });

  const { finalScore, categoryScores, scoringBreakdown } = scoreMatches({
    matches,
    rfpText,
    proposalText,
    requestId,
  });

  const { detailedExplanation, missingRequirements, partialMatches } = generateExplanation({
    matches,
    finalScore,
    categoryScores,
    scoringBreakdown,
  });

  const durationMs = Date.now() - startedAt;
  const payload = {
    request_id: requestId,
    final_compliance_score: finalScore,
    category_wise_scores: categoryScores,
    detailed_explanation: detailedExplanation,
    missing_requirements: missingRequirements,
    partial_matches: partialMatches,
    requirement_matches: matches,
    extracted_json: {
      rfp: rfpExtraction,
      proposal: proposalExtraction,
    },
  };

  const response = {
    ...payload,
    metadata: {
      duration_ms: durationMs,
      requirement_count: matches.length,
      missing_count: missingRequirements.length,
      partial_count: partialMatches.length,
      generated_at: new Date().toISOString(),
    },
  };

  if (!includeDebug) {
    delete response.extracted_json;
  }

  logDebug(requestId, "analysis_completed", {
    durationMs,
    finalScore,
    requirementCount: matches.length,
  });

  return response;
};

module.exports = {
  analyzeTenderCompliance,
};
