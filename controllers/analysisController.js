const { readTextFromFile } = require("../services/analysis/documentParserService");
const { analyzeTenderCompliance } = require("../services/analysis/analysisPipelineService");

const toBoolean = (value, defaultValue = true) => {
  if (value === undefined || value === null) {
    return defaultValue;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value).toLowerCase().trim();
  if (["1", "true", "yes"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no"].includes(normalized)) {
    return false;
  }

  return defaultValue;
};

const analyzeFromFiles = async (req, res) => {
  try {
    const rfpFile = req.files?.rfp?.[0];
    const proposalFile = req.files?.proposal?.[0];

    if (!rfpFile || !proposalFile) {
      return res.status(400).json({
        message: "Both rfp and proposal files are required.",
      });
    }

    const includeDebug = toBoolean(req.body.debug, true);

    const [rfpText, proposalText] = await Promise.all([
      readTextFromFile(rfpFile, "RFP"),
      readTextFromFile(proposalFile, "Proposal"),
    ]);

    const analysis = await analyzeTenderCompliance({
      rfpText,
      proposalText,
      includeDebug,
    });

    return res.status(200).json({
      message: "Analysis completed successfully.",
      data: analysis,
    });
  } catch (error) {
    return res.status(400).json({
      message: "Analysis failed.",
      error: error.message,
    });
  }
};

const analyzeFromText = async (req, res) => {
  try {
    const { rfp_text: rfpText, proposal_text: proposalText, debug } = req.body || {};

    if (!String(rfpText || "").trim()) {
      return res.status(400).json({
        message: "rfp_text is required.",
      });
    }

    if (!String(proposalText || "").trim()) {
      return res.status(400).json({
        message: "proposal_text is required.",
      });
    }

    const analysis = await analyzeTenderCompliance({
      rfpText,
      proposalText,
      includeDebug: toBoolean(debug, true),
    });

    return res.status(200).json({
      message: "Analysis completed successfully.",
      data: analysis,
    });
  } catch (error) {
    return res.status(400).json({
      message: "Analysis failed.",
      error: error.message,
    });
  }
};

module.exports = {
  analyzeFromFiles,
  analyzeFromText,
};
