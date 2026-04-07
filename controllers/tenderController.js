const path = require("path");
const Tender = require("../models/Tender");
const { upload } = require("../services/fileService");

const uploadSingleTenderPdf = (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (!error) {
      return next();
    }

    const isMulterError = error.name === "MulterError";
    const statusCode = isMulterError ? 400 : 400;
    const message = isMulterError
      ? "Invalid upload request. Ensure the file is a PDF and less than 10MB."
      : error.message;

    return res.status(statusCode).json({
      message,
      error: error.message,
    });
  });
};

const createTenderRecord = async (req, res) => {
  try {
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        message: "Title is required.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "No tender file uploaded. Upload a PDF using the file field.",
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

const getAllTenders = async (req, res) => {
  try {
    const tenders = await Tender.find().sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Tenders fetched successfully.",
      count: tenders.length,
      data: tenders,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch tenders.",
      error: error.message,
    });
  }
};

module.exports = {
  uploadTender: [uploadSingleTenderPdf, createTenderRecord],
  getAllTenders,
};
