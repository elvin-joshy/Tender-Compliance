const mongoose = require("mongoose");

const tenderSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    fileUrl: {
      type: String,
      default: "",
      trim: true,
    },
    extractedText: {
      type: String,
      default: "",
    },
    requirements: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Tender", tenderSchema);
