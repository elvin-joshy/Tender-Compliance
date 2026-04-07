const express = require("express");
const tenderController = require("../controllers/tenderController");

const router = express.Router();

router.get("/", tenderController.getAllTenders);

router.post("/upload-tender", tenderController.uploadTender);

module.exports = router;
