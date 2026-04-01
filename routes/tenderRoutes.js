const express = require("express");
const tenderController = require("../controllers/tenderController");
const { upload } = require("../services/fileService");

const router = express.Router();

// Upload a tender PDF under field name "tenderFile".
router.post(
  "/upload-tender",
  upload.single("tenderFile"),
  tenderController.uploadTender
);

module.exports = router;
