const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
  {
    tenderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tender",
      required: true,
    },
    documents: {
      type: [String],
      default: [],
    },
    complianceResult: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Submission", submissionSchema);
