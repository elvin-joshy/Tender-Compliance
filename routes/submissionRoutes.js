const express = require("express");
const {
  createSubmission,
  getSubmissionsByTenderId,
} = require("../controllers/submissionController");

const router = express.Router();

router.post("/", createSubmission);
router.get("/:tenderId", getSubmissionsByTenderId);

module.exports = router;
