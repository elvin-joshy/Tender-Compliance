const express = require("express");
const { analysisUpload } = require("../middlewares/analysisUpload");
const {
  analyzeFromFiles,
  analyzeFromText,
} = require("../controllers/analysisController");

const router = express.Router();

router.post(
  "/run",
  analysisUpload.fields([
    { name: "rfp", maxCount: 1 },
    { name: "proposal", maxCount: 1 },
  ]),
  analyzeFromFiles
);

router.post("/run-text", analyzeFromText);

module.exports = router;
