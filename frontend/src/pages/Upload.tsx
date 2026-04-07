import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FileUploadCard } from "@/components/FileUploadCard";
import { Shield, FileText, ArrowLeft, ArrowRight } from "lucide-react";
import { validateProposal } from "@/services/api";
import { toast } from "sonner";

const UploadPage = () => {
  const navigate = useNavigate();
  const [rfpFile, setRfpFile] = useState<File | null>(null);
  const [proposalFile, setProposalFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleAnalyze = async () => {
    if (!rfpFile || !proposalFile) {
      setErrorMessage("Upload both documents before analysis.");
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage("");

    try {
      const validationResponse = await validateProposal(rfpFile, proposalFile);

      sessionStorage.setItem("validationResult", JSON.stringify(validationResponse));
      toast.success("Analysis complete", {
        description: "Compliance results are ready.",
      });
      navigate("/results", { state: { validationResult: validationResponse } });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Analysis failed.";
      setErrorMessage(message);
      toast.error("Analysis failed", {
        description: message,
      });
    } finally {
      setIsAnalyzing(false);
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
            onClick={() => navigate("/history")}
            className="px-4 py-2 rounded-lg bg-muted text-foreground text-sm font-medium transition-all hover:bg-muted/80"
          >
            History
          </button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl font-bold text-foreground mb-3">Upload Documents</h1>
          <p className="text-muted-foreground">
            Upload your RFP and vendor proposal to start the compliance analysis.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-6 mb-10">
          <FileUploadCard
            title="RFP Document"
            description="Upload the Request for Proposal"
            icon={<FileText className="w-6 h-6" />}
            onFileSelect={(file) => {
              setRfpFile(file);
              setErrorMessage("");
            }}
          />
          <FileUploadCard
            title="Vendor Proposal"
            description="Upload the vendor's response"
            icon={<FileText className="w-6 h-6" />}
            onFileSelect={(file) => {
              setProposalFile(file);
              setErrorMessage("");
            }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={!rfpFile || !proposalFile || isAnalyzing}
            onClick={handleAnalyze}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-medium shadow-elevated transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                Analyze Compliance
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </motion.button>
          {(!rfpFile || !proposalFile) && (
            <p className="text-xs text-muted-foreground mt-3">
              Upload both documents to proceed
            </p>
          )}
          {errorMessage && <p className="text-xs text-destructive mt-3">{errorMessage}</p>}
        </motion.div>
      </div>
    </div>
  );
};

export default UploadPage;
