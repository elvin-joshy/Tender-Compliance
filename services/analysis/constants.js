const CATEGORY_WEIGHTS = {
  functional: 0.4,
  technical: 0.3,
  compliance: 0.2,
  timeline: 0.1,
};

const MATCH_THRESHOLDS = {
  full: 0.75,
  partial: 0.4,
};

const MAX_VARIANCE_PERCENT = 2;

const CRITICAL_KEYWORDS = [
  "mandatory",
  "compliance",
  "regulatory",
  "security",
  "certificate",
  "certification",
  "iso",
  "gdpr",
  "sla",
  "availability",
  "uptime",
  "penalty",
  "audit",
];

const RFP_EXTRACTION_TEMPLATE = {
  functional_requirements: [],
  technical_requirements: [],
  compliance_requirements: [],
  timeline: "",
  budget: "",
  evaluation_criteria: [],
};

const PROPOSAL_EXTRACTION_TEMPLATE = {
  features: [],
  tech_stack: [],
  certifications: [],
  timeline: "",
  pricing: "",
  methodology: [],
};

module.exports = {
  CATEGORY_WEIGHTS,
  MATCH_THRESHOLDS,
  MAX_VARIANCE_PERCENT,
  CRITICAL_KEYWORDS,
  RFP_EXTRACTION_TEMPLATE,
  PROPOSAL_EXTRACTION_TEMPLATE,
};
