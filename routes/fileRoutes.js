const express = require("express");
const upload = require("../middlewares/upload");
const {
  uploadFile,
  getAllFiles,
  getFileById,
  deleteFileById,
} = require("../controllers/fileController");

const router = express.Router();

router.post("/upload", upload.single("file"), uploadFile);
router.get("/", getAllFiles);
router.get("/:id", getFileById);
router.delete("/:id", deleteFileById);

module.exports = router;
