const path = require("path");
const Tender = require("../models/Tender");

const uploadTender = async (req, res) => {
  try {
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        message: "Title is required.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "No tender file uploaded. Please upload a PDF as tenderFile.",
      });
    }

    // Store a portable relative path like uploads/file.pdf.
    const fileUrl = path.join("uploads", req.file.filename).replace(/\\/g, "/");

    const tender = await Tender.create({
      title: title.trim(),
      fileUrl,
      extractedText: "",
      requirements: [],
    });

    return res.status(201).json({
      message: "Tender uploaded successfully.",
      data: tender,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to upload tender.",
      error: error.message,
    });
  }
};

module.exports = {
  uploadTender,
};
