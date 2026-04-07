const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const tenderRoutes = require("./routes/tenderRoutes");
const analysisRoutes = require("./routes/analysisRoutes");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const mongoUri = process.env.MONGO_URI;
const uploadsDirectory = path.join(__dirname, "uploads");

// Create uploads folder automatically when the server boots.
if (!fs.existsSync(uploadsDirectory)) {
  fs.mkdirSync(uploadsDirectory, { recursive: true });
}

const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : "*";

app.use(cors({ origin: corsOrigin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Expose uploaded files as static assets.
app.use("/uploads", express.static(uploadsDirectory));

app.get("/api/health", (req, res) => {
  res.status(200).json({
    message: "Server is running.",
  });
});

app.use("/api/tenders", tenderRoutes);
app.use("/api/analysis", analysisRoutes);

app.use((err, req, res, next) => {
  if (err && err.name === "MulterError") {
    return res.status(400).json({
      message: "Upload failed.",
      error: err.message,
    });
  }

  if (err) {
    const statusCode = err.message === "Only PDF files are allowed." ? 400 : 500;

    return res.status(statusCode).json({
      message: statusCode === 400 ? "Invalid file upload." : "Unexpected server error.",
      error: err.message,
    });
  }

  return next();
});

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found.",
  });
});

const startServer = async () => {
  if (!mongoUri) {
    console.error("MONGO_URI is missing in environment variables.");
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected successfully.");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }

  app.listen(port, () => {
    console.log("Server running at http://localhost:" + port);
  });
};

startServer();
