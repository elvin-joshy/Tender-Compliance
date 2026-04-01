const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadsDirectory = path.join(__dirname, "..", "uploads");

// Ensure uploads directory exists before multer tries to write files.
if (!fs.existsSync(uploadsDirectory)) {
  fs.mkdirSync(uploadsDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDirectory);
  },
  filename: (req, file, cb) => {
    const safeOriginalName = file.originalname.replace(/\s+/g, "-");
    cb(null, Date.now() + "-" + safeOriginalName);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype !== "application/pdf") {
    return cb(new Error("Only PDF files are allowed."), false);
  }

  return cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

module.exports = {
  upload,
};
