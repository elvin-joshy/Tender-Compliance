import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Clock3, Eye, Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteAnalysis, getAnalyses, type AnalysisRecord } from "@/services/api";
import { cn } from "@/lib/utils";

const scoreClass = (score: number): string => {
  if (score >= 80) {
    return "bg-success/15 text-success";
  }

  if (score >= 55) {
    return "bg-warning/15 text-warning";
  }

  return "bg-destructive/15 text-destructive";
};

const History = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string>("");
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErrorMessage("");

      try {
        const records = await getAnalyses();
        setAnalyses(records);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load analysis history.";
        setErrorMessage(message);
        toast.error("History unavailable", { description: message });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const handleDelete = async (analysisId: string) => {
    const confirmed = window.confirm("Delete this analysis permanently?");
    if (!confirmed) {
      return;
    }

    setDeletingId(analysisId);

    try {
      await deleteAnalysis(analysisId);
      setAnalyses((prev) => prev.filter((item) => item.analysis_id !== analysisId));
      toast.success("Analysis deleted");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Delete failed.";
      toast.error("Delete failed", { description: message });
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 bg-card/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="w-full px-4 sm:px-8 lg:px-12 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">TenderCV</span>
          </button>
          <button
            onClick={() => navigate("/upload")}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium transition-all hover:opacity-90"
          >
            New Analysis
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Analysis History</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and reopen previous compliance analyses.
          </p>
        </motion.div>

        {loading && (
          <div className="grid md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((key) => (
              <div key={key} className="rounded-2xl border border-border bg-card p-5 animate-pulse">
                <div className="h-4 w-40 bg-muted rounded mb-4" />
                <div className="h-3 w-24 bg-muted rounded mb-2" />
                <div className="h-3 w-full bg-muted rounded" />
              </div>
            ))}
          </div>
        )}

        {!loading && errorMessage && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        {!loading && !errorMessage && analyses.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <h2 className="text-lg font-semibold text-foreground">No analyses yet</h2>
            <p className="text-sm text-muted-foreground mt-2 mb-6">
              Run your first document validation to start building history.
            </p>
            <button
              onClick={() => navigate("/upload")}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium transition-all hover:opacity-90"
            >
              Go to Upload
            </button>
          </div>
        )}

        {!loading && !errorMessage && analyses.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4">
            {analyses.map((item, index) => (
              <motion.div
                key={item.analysis_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="rounded-2xl border border-border bg-card p-5 shadow-card"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.analysis_id}</p>
                    <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1">
                      <Clock3 className="w-3 h-3" />
                      {new Date(item.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-semibold",
                      scoreClass(item.summary?.compliance_score ?? 0)
                    )}
                  >
                    {Math.round(item.summary?.compliance_score ?? 0)}%
                  </span>
                </div>

                <div className="mt-4 text-xs text-muted-foreground">
                  <p>
                    Matched: {item.summary?.matched_count ?? 0} | Weak: {item.summary?.weak_count ?? 0} | Missing: {item.summary?.missing_count ?? 0}
                  </p>
                </div>

                <div className="mt-5 flex items-center gap-2">
                  <button
                    onClick={() => navigate("/results", { state: { analysisId: item.analysis_id } })}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Open
                  </button>
                  <button
                    onClick={() => handleDelete(item.analysis_id)}
                    disabled={deletingId === item.analysis_id}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-foreground text-xs font-medium hover:bg-muted/80 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {deletingId === item.analysis_id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
