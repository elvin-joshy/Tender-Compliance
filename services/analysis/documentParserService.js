const path = require("path");
const pdfParse = require("pdf-parse");
const { normalizeText } = require("./utils");

const MAX_TEXT_BYTES = Number(process.env.ANALYSIS_MAX_TEXT_BYTES || 20 * 1024 * 1024);

const isPdfFile = (file) => {
  const mimetype = String(file?.mimetype || "").toLowerCase();
  const filename = String(file?.originalname || "").toLowerCase();
  return mimetype === "application/pdf" || path.extname(filename) === ".pdf";
};

const isTextFile = (file) => {
  const mimetype = String(file?.mimetype || "").toLowerCase();
  const filename = String(file?.originalname || "").toLowerCase();

  return (
    mimetype.startsWith("text/") ||
    mimetype === "application/json" ||
    [".txt", ".md", ".csv", ".json"].includes(path.extname(filename))
  );
};

const validateFile = (file, label) => {
  if (!file) {
    throw new Error(`${label} file is required.`);
  }

  const buffer = file.buffer;
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error(`${label} file is empty.`);
  }

  if (buffer.length > MAX_TEXT_BYTES) {
    throw new Error(`${label} file exceeds the ${Math.round(MAX_TEXT_BYTES / (1024 * 1024))}MB limit.`);
  }

  if (!isPdfFile(file) && !isTextFile(file)) {
    throw new Error(`${label} must be a PDF or text file.`);
  }
};

const readTextFromFile = async (file, label) => {
  validateFile(file, label);

  if (isPdfFile(file)) {
    const parsed = await pdfParse(file.buffer);
    const text = normalizeText(parsed?.text || "");
    if (!text) {
      throw new Error(`${label} PDF did not contain readable text.`);
    }
    return text;
  }

  const text = normalizeText(file.buffer.toString("utf-8"));
  if (!text) {
    throw new Error(`${label} text file did not contain readable text.`);
  }

  return text;
};

module.exports = {
  readTextFromFile,
};
