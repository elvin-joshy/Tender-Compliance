import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Shield, FileSearch, BarChart3, ArrowRight } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/50 bg-card/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="w-full px-4 sm:px-8 lg:px-12 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-semibold text-foreground text-lg">TenderCV</span>
          </div>
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
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-medium mb-6 border border-border">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            AI-Powered Analysis
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-foreground leading-[1.1] mb-6">
            Tender Compliance{" "}
            <span className="gradient-text">Validator</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            Automatically validate vendor proposals against RFP requirements.
            Save hours of manual review with AI-powered compliance analysis.
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/upload")}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-medium text-base shadow-elevated transition-all hover:opacity-90"
          >
            Start Analysis
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="grid md:grid-cols-3 gap-6 mt-24"
        >
          {[
            {
              icon: <FileSearch className="w-5 h-5" />,
              title: "Upload Documents",
              desc: "Upload your RFP and vendor proposals in PDF or text format.",
            },
            {
              icon: <Shield className="w-5 h-5" />,
              title: "AI Analysis",
              desc: "Our AI extracts requirements and validates compliance automatically.",
            },
            {
              icon: <BarChart3 className="w-5 h-5" />,
              title: "Detailed Results",
              desc: "Get a comprehensive compliance report with risk flags and scores.",
            },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
              className="rounded-2xl bg-card border border-border p-6 shadow-card transition-all duration-300 hover:shadow-card-hover group"
            >
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-primary mb-4 transition-transform group-hover:scale-110">
                {f.icon}
              </div>
              <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </div>
  );
};

export default Landing;
