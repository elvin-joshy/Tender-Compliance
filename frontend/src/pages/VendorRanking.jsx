import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, FileText, Shield } from "lucide-react";
import { FileUploadCard } from "@/components/FileUploadCard";

const VENDOR_API_BASE = (
  import.meta.env.VITE_VENDOR_API_BASE_URL || "http://127.0.0.1:5000"
).replace(/\/+$/, "");

const createVendor = () => ({ name: "", file: null });

const VendorRanking = () => {
  const navigate = useNavigate();
  const [rfpFile, setRfpFile] = useState(null);
  const [vendors, setVendors] = useState([createVendor(), createVendor()]);
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const endpoint = useMemo(() => `${VENDOR_API_BASE}/api/rfp/analyze`, []);

  const updateVendor = (index, key, value) => {
    setVendors((prev) => prev.map((vendor, i) => (i === index ? { ...vendor, [key]: value } : vendor)));
  };

  const addVendor = () => {
    setVendors((prev) => [...prev, createVendor()]);
  };

  const removeVendor = (index) => {
    setVendors((prev) => {
      if (prev.length <= 1) {
        return prev;
      }

      return prev.filter((_, i) => i !== index);
    });
  };

  const handleAnalyze = async () => {
    setError("");
    setRankings([]);

    if (!rfpFile) {
      setError("Upload one RFP document before analysis.");
      return;
    }

    const cleanedVendors = vendors
      .map((vendor) => ({
        name: vendor.name.trim(),
        file: vendor.file,
      }))
      .filter((vendor) => vendor.file);

    if (cleanedVendors.length === 0) {
      setError("Upload at least one vendor proposal document.");
      return;
    }

    const formData = new FormData();
    formData.append("rfp", rfpFile);
    cleanedVendors.forEach((vendor) => {
      formData.append("vendors", vendor.file);
    });
    formData.append(
      "vendorNames",
      JSON.stringify(
        cleanedVendors.map((vendor, index) => vendor.name || `Vendor ${index + 1}`)
      )
    );

    setLoading(true);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Vendor analysis failed.");
      }

      setRankings(Array.isArray(payload.rankings) ? payload.rankings : []);
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Vendor analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  const getRankStyle = (index) => {
    if (index === 0) {
      return "border-green-300 bg-green-50";
    }

    if (index === rankings.length - 1) {
      return "border-red-300 bg-red-50";
    }

    return "border-yellow-300 bg-yellow-50";
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <nav className="border-b border-border/50 bg-card/50 backdrop-blur-lg sticky top-0 z-50 mb-8">
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
            className="px-4 py-2 rounded-lg bg-muted text-foreground text-sm font-medium transition-all hover:bg-muted/80"
          >
            Compliance Upload
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-3xl font-bold text-foreground mb-2">Vendor Ranking System</h1>
          <p className="text-muted-foreground">
            Upload one RFP document and multiple vendor proposals to rank vendors by match score.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-1 gap-6">
          <FileUploadCard
            title="RFP Document (1 file)"
            description="Upload the Request for Proposal"
            icon={<FileText className="w-6 h-6" />}
            onFileSelect={(file) => {
              setRfpFile(file);
              setError("");
            }}
          />
        </div>

        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Vendor Proposals (Multiple)</h2>
            <button
              onClick={addVendor}
              className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm"
            >
              Add Vendor
            </button>
          </div>

          {vendors.map((vendor, index) => (
            <div key={`vendor-${index}`} className="border border-border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <input
                  value={vendor.name}
                  onChange={(event) => updateVendor(index, "name", event.target.value)}
                  placeholder={`Vendor ${index + 1} Name (optional)`}
                  className="min-w-[220px] flex-1 border border-border rounded-md p-2 bg-background"
                />
                <button
                  onClick={() => removeVendor(index)}
                  className="px-3 py-2 rounded-md bg-muted text-foreground text-sm"
                >
                  Remove
                </button>
              </div>

              <FileUploadCard
                title={`Vendor Proposal ${index + 1}`}
                description="Upload vendor proposal document"
                icon={<FileText className="w-6 h-6" />}
                onFileSelect={(file) => {
                  updateVendor(index, "file", file);
                  setError("");
                }}
              />
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-60"
          >
            {loading ? "Analyzing..." : "Analyze Vendors"}
            {!loading ? <ArrowRight className="w-4 h-4" /> : null}
          </button>

          {error ? <p className="text-red-600 text-sm">{error}</p> : null}
        </div>

        {rankings.length > 0 ? (
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h2 className="text-2xl font-bold">🏆 Vendor Rankings</h2>

            {rankings.map((vendor, index) => (
              <div
                key={`${vendor.name}-${index}`}
                className={`border rounded-lg p-4 ${getRankStyle(index)}`}
              >
                <p className="text-base font-semibold">
                  #{index + 1} {vendor.name} - {vendor.score}%
                </p>
                <p className="text-sm mt-1">Explanation: {vendor.explanation}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default VendorRanking;
