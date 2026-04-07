const express = require("express");
const { analyzeVendors } = require("../controllers/rfpController");
const { analysisUpload } = require("../middlewares/analysisUpload");

const router = express.Router();

router.post(
	"/analyze",
	analysisUpload.fields([
		{ name: "rfp", maxCount: 1 },
		{ name: "vendors", maxCount: 20 },
	]),
	analyzeVendors
);

module.exports = router;
