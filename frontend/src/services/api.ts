const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");

const buildUrl = (path: string): string => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_URL}${normalizedPath}`;
};

export type ValidationResultItem = {
  requirement: string;
  matched_text: string;
  score: number;
  status: "Matched" | "Weak" | "Missing";
  confidence: number;
  reason: string;
  category?: string;
};

export type AnalysisSummary = {
  total_requirements: number;
  matched_count: number;
  weak_count: number;
  missing_count: number;
  compliance_score: number;
};

export type RiskFlags = {
  risk_flag: boolean;
  reason: string;
};

export type ValidationResponse = {
  analysis_id?: string;
  timestamp?: string;
  results?: ValidationResultItem[];
  summary?: AnalysisSummary;
  validation_results: ValidationResultItem[];
  matched_requirements: ValidationResultItem[];
  missing_requirements: ValidationResultItem[];
  confidence_scores: Array<{
    requirement: string;
    confidence: number;
    reason: string;
  }>;
  risk_flags: RiskFlags;
};

export type AnalysisRecord = {
  analysis_id: string;
  timestamp: string;
  rfp_text: string;
  proposal_text: string;
  results: ValidationResultItem[];
  summary: AnalysisSummary;
  risk_flags: RiskFlags;
};

type AnalysesResponse = {
  analyses: AnalysisRecord[];
  count: number;
};

const toErrorMessage = async (response: Response): Promise<string> => {
  try {
    const payload = await response.json();
    if (typeof payload?.error === "string") {
      return payload.error;
    }
    if (typeof payload?.detail === "string") {
      return payload.detail;
    }
    if (typeof payload?.message === "string") {
      return payload.message;
    }
  } catch {
    // Ignore JSON parsing issues and use generic fallback below.
  }

  return `Request failed with status ${response.status}`;
};

export async function validateProposal(
  rfpFile: File,
  proposalFile: File
): Promise<ValidationResponse> {
  const formData = new FormData();
  formData.append("rfp", rfpFile);
  formData.append("proposal", proposalFile);

  const response = await fetch(buildUrl("/validate"), {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await toErrorMessage(response));
  }

  return (await response.json()) as ValidationResponse;
}

export async function getAnalyses(): Promise<AnalysisRecord[]> {
  const response = await fetch(buildUrl("/analyses"));

  if (!response.ok) {
    throw new Error(await toErrorMessage(response));
  }

  const payload = (await response.json()) as AnalysesResponse;
  return Array.isArray(payload.analyses) ? payload.analyses : [];
}

export async function getAnalysisById(analysisId: string): Promise<AnalysisRecord> {
  const response = await fetch(buildUrl(`/analyses/${analysisId}`));

  if (!response.ok) {
    throw new Error(await toErrorMessage(response));
  }

  return (await response.json()) as AnalysisRecord;
}

export async function deleteAnalysis(analysisId: string): Promise<void> {
  const response = await fetch(buildUrl(`/analyses/${analysisId}`), {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await toErrorMessage(response));
  }
}
