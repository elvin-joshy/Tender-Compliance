const fs = require("fs");
const path = require("path");
const FileRecord = require("../models/FileRecord");

const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file was uploaded." });
    }

    const fileUrl =
      req.protocol + "://" + req.get("host") + "/uploads/" + req.file.filename;

    const record = await FileRecord.create({
      originalName: req.file.originalname,
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      sizeInBytes: req.file.size,
      fileUrl,
      title: req.body.title || "",
      description: req.body.description || "",
    });

    return res.status(201).json({
      message: "File uploaded and metadata stored successfully.",
      data: record,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to upload file.",
      error: error.message,
    });
  }
};

const getAllFiles = async (req, res) => {
  try {
    const records = await FileRecord.find().sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Files fetched successfully.",
      count: records.length,
      data: records,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch files.",
      error: error.message,
    });
  }
};

const getFileById = async (req, res) => {
  try {
    const record = await FileRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ message: "File record not found." });
    }

    return res.status(200).json({
      message: "File record fetched successfully.",
      data: record,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch file record.",
      error: error.message,
    });
  }
};

const deleteFileById = async (req, res) => {
  try {
    const record = await FileRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ message: "File record not found." });
    }

    const absolutePath = path.join(__dirname, "..", "uploads", record.storedName);

    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }

    await FileRecord.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      message: "File and metadata deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete file record.",
      error: error.message,
    });
  }
};

module.exports = {
  uploadFile,
  getAllFiles,
  getFileById,
  deleteFileById,
};
