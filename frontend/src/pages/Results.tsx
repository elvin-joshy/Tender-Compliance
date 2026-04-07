import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ScoreCard } from "@/components/ScoreCard";
import { ResultTable, type ComplianceRow } from "@/components/ResultTable";
import { SkeletonTable } from "@/components/SkeletonTable";
import { Shield, ArrowLeft, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  getAnalysisById,
  type AnalysisRecord,
  type ValidationResponse,
  type ValidationResultItem,
} from "@/services/api";

const filters = ["All", "Matched", "Weak", "Missing"] as const;

type ResultsLocationState = {
  validationResult?: ValidationResponse;
  analysisId?: string;
};

const toRows = (items: ValidationResultItem[], globalRiskFlag: boolean): ComplianceRow[] => {
  return items.map((item, index) => {
    const normalizedConfidence =
      item.confidence <= 1 ? Math.round(item.confidence * 100) : Math.round(item.confidence);
    const rowIsRisky = globalRiskFlag && item.status !== "Matched";

    return {
      id: String(index + 1),
      requirement: item.requirement,
      category: item.category || "Technical",
      status: item.status,
      confidence: normalizedConfidence,
      matchedText: item.matched_text || "",
      reason:
        item.reason ||
        (rowIsRisky
          ? "Requirement is not fully matched and needs manual review."
          : "No risk detected for this requirement."),
      riskFlag: rowIsRisky,
    };
  });
};

const extractItems = (payload: ValidationResponse | AnalysisRecord): ValidationResultItem[] => {
  if (Array.isArray(payload.validation_results)) {
    return payload.validation_results;
  }

  if (Array.isArray(payload.results)) {
    return payload.results;
  }

  return [];
};

const Results = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [results, setResults] = useState<ComplianceRow[]>([]);
  const [riskReason, setRiskReason] = useState("No risky language detected");
  const [errorMessage, setErrorMessage] = useState("");
  const [analysisId, setAnalysisId] = useState<string>("");
  const [timestamp, setTimestamp] = useState<string>("");
  const [scoreFromSummary, setScoreFromSummary] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      try {
        const state = location.state as ResultsLocationState | null;
        const statePayload = state?.validationResult;
        const stateAnalysisId = state?.analysisId;
        const storagePayload = sessionStorage.getItem("validationResult");
        const parsedStoragePayload = storagePayload
          ? (JSON.parse(storagePayload) as ValidationResponse)
          : undefined;

        let payload: ValidationResponse | AnalysisRecord | undefined;

        if (stateAnalysisId) {
          payload = await getAnalysisById(stateAnalysisId);
        } else {
          payload = statePayload || parsedStoragePayload;
        }

        if (!payload) {
          throw new Error("No analysis result found. Please run Analyze again.");
        }

        const items = extractItems(payload);
        if (items.length === 0) {
          throw new Error("No analysis data found for this record.");
        }

        const globalRiskFlag = Boolean(payload.risk_flags?.risk_flag);
        const mappedResults = toRows(items, globalRiskFlag);

        setResults(mappedResults);
        setRiskReason(payload.risk_flags?.reason || "No risky language detected");
        setAnalysisId(payload.analysis_id || "");
        setTimestamp(payload.timestamp || "");
        setScoreFromSummary(payload.summary?.compliance_score ?? null);
        setErrorMessage("");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load analysis results.";
        setResults([]);
        setErrorMessage(message);
        toast.error("Results unavailable", {
          description: message,
        });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [location.state]);

  const matched = results.filter((r) => r.status === "Matched").length;
  const weak = results.filter((r) => r.status === "Weak").length;
  const missing = results.filter((r) => r.status === "Missing").length;
  const total = results.length;
  const score =
    typeof scoreFromSummary === "number"
      ? Math.max(0, Math.min(100, Math.round(scoreFromSummary)))
      : total > 0
      ? Math.round((matched / total) * 100 + (weak / total) * 20)
      : 0;
  const riskyCount = results.filter((r) => r.riskFlag).length;

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 bg-card/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="w-full px-4 sm:px-8 lg:px-12 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate("/upload")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">TenderCV</span>
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/history")}
              className="px-4 py-2 rounded-lg bg-muted text-foreground text-sm font-medium transition-all hover:bg-muted/80"
            >
              History
            </button>
            <button
              onClick={() => navigate("/upload")}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium transition-all hover:opacity-90"
            >
              New Analysis
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold text-foreground mb-1">Compliance Results</h1>
          <p className="text-muted-foreground text-sm">
            Analysis of vendor proposal against RFP requirements
            {analysisId ? ` • ID: ${analysisId}` : ""}
            {timestamp ? ` • ${new Date(timestamp).toLocaleString()}` : ""}
          </p>
        </motion.div>

        {/* Score + Filters */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <ScoreCard
            score={score}
            matched={matched}
            weak={weak}
            missing={missing}
            className="lg:col-span-1"
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 rounded-2xl bg-card border border-border p-6 shadow-card flex flex-col justify-between"
          >
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Risk Summary</h3>
              <p className="text-foreground text-sm leading-relaxed">
                {errorMessage
                  ? errorMessage
                  : `${riskyCount} requirements flagged as high risk. ${riskReason}`}
              </p>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Filter className="w-4 h-4 text-muted-foreground" />
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    activeFilter === f
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Table */}
        {loading ? <SkeletonTable /> : <ResultTable data={results} filter={activeFilter} />}
      </div>
    </div>
  );
};

export default Results;
