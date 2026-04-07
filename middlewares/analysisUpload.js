const multer = require("multer");

const MAX_UPLOAD_MB = Number(process.env.ANALYSIS_MAX_UPLOAD_MB || 20);

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const mimetype = String(file?.mimetype || "").toLowerCase();
  const name = String(file?.originalname || "").toLowerCase();

  const isPdf = mimetype === "application/pdf" || name.endsWith(".pdf");
  const isText =
    mimetype.startsWith("text/") ||
    mimetype === "application/json" ||
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    name.endsWith(".json") ||
    name.endsWith(".csv");

  if (!isPdf && !isText) {
    return cb(new Error("Only PDF or text files are allowed."));
  }

  return cb(null, true);
};

const analysisUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_UPLOAD_MB * 1024 * 1024,
  },
});

module.exports = {
  analysisUpload,
};
