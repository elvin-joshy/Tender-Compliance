const path = require("path");
const { rankVendors } = require("../services/vendorRankingService");
const { readTextFromFile } = require("../services/analysis/documentParserService");

const parseVendorNames = (rawValue) => {
  if (Array.isArray(rawValue)) {
    return rawValue.map((name) => String(name || "").trim());
  }

  if (typeof rawValue === "string") {
    const trimmed = rawValue.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((name) => String(name || "").trim());
      }
    } catch {
      return [trimmed];
    }

    return [trimmed];
  }

  return [];
};

const getVendorNameFromFile = (file, index, vendorNames = []) => {
  const providedName = String(vendorNames[index] || "").trim();
  if (providedName) {
    return providedName;
  }

  const filename = String(file?.originalname || "").trim();
  if (!filename) {
    return `Vendor ${index + 1}`;
  }

  return path.parse(filename).name || `Vendor ${index + 1}`;
};

const analyzeVendorsFromFiles = async (req, res) => {
  const rfpFile = req.files?.rfp?.[0];
  const vendorFiles = req.files?.vendors || [];

  if (!rfpFile) {
    return res.status(400).json({
      success: false,
      message: "rfp file is required.",
    });
  }

  if (!Array.isArray(vendorFiles) || vendorFiles.length === 0) {
    return res.status(400).json({
      success: false,
      message: "At least one vendor proposal file is required.",
    });
  }

  try {
    const vendorNames = parseVendorNames(req.body?.vendorNames);
    const rfpText = await readTextFromFile(rfpFile, "RFP");

    const vendorTexts = await Promise.all(
      vendorFiles.map(async (file, index) => {
        const vendorText = await readTextFromFile(file, `Vendor ${index + 1}`);
        return {
          name: getVendorNameFromFile(file, index, vendorNames),
          text: vendorText,
        };
      })
    );

    const rankings = rankVendors(rfpText, vendorTexts);

    return res.status(200).json({
      success: true,
      rankings,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Vendor analysis failed.",
    });
  }
};

const analyzeVendorsFromText = (req, res) => {
  const { rfpText, vendors } = req.body || {};

  if (!String(rfpText || "").trim()) {
    return res.status(400).json({
      success: false,
      message: "rfpText is required.",
    });
  }

  if (!Array.isArray(vendors) || vendors.length === 0) {
    return res.status(400).json({
      success: false,
      message: "vendors must be a non-empty array.",
    });
  }

  const invalidVendor = vendors.find(
    (vendor) =>
      !vendor || !String(vendor.name || "").trim() || !String(vendor.text || "").trim()
  );

  if (invalidVendor) {
    return res.status(400).json({
      success: false,
      message: "Each vendor must include name and text.",
    });
  }

  const rankings = rankVendors(rfpText, vendors);

  return res.status(200).json({
    success: true,
    rankings,
  });
};

const analyzeVendors = async (req, res) => {
  const hasUploadedFiles = Boolean(req.files?.rfp?.[0] || (req.files?.vendors || []).length);

  if (hasUploadedFiles) {
    return analyzeVendorsFromFiles(req, res);
  }

  return analyzeVendorsFromText(req, res);
};

module.exports = {
  analyzeVendors,
};
