const mongoose = require("mongoose");
const Submission = require("../models/Submission");
const Tender = require("../models/Tender");

const createSubmission = async (req, res) => {
  try {
    const { tenderId, documents = [], complianceResult = {} } = req.body;

    if (!tenderId) {
      return res.status(400).json({
        message: "tenderId is required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(tenderId)) {
      return res.status(400).json({
        message: "Invalid tenderId format.",
      });
    }

    const tender = await Tender.findById(tenderId);
    if (!tender) {
      return res.status(400).json({
        message: "Tender not found for provided tenderId.",
      });
    }

    let normalizedDocuments = documents;
    if (!Array.isArray(normalizedDocuments)) {
      if (typeof normalizedDocuments === "string" && normalizedDocuments.trim()) {
        normalizedDocuments = [normalizedDocuments.trim()];
      } else {
        normalizedDocuments = [];
      }
    }

    const invalidDocument = normalizedDocuments.find(
      (doc) => typeof doc !== "string"
    );

    if (invalidDocument !== undefined) {
      return res.status(400).json({
        message: "documents must be an array of strings.",
      });
    }

    const submission = await Submission.create({
      tenderId,
      documents: normalizedDocuments,
      complianceResult:
        complianceResult && typeof complianceResult === "object"
          ? complianceResult
          : {},
    });

    return res.status(201).json({
      message: "Submission created successfully.",
      data: submission,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to create submission.",
      error: error.message,
    });
  }
};

const getSubmissionsByTenderId = async (req, res) => {
  try {
    const { tenderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(tenderId)) {
      return res.status(400).json({
        message: "Invalid tenderId format.",
      });
    }

    const submissions = await Submission.find({ tenderId }).sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Submissions fetched successfully.",
      count: submissions.length,
      data: submissions,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch submissions.",
      error: error.message,
    });
  }
};

module.exports = {
  createSubmission,
  getSubmissionsByTenderId,
};
