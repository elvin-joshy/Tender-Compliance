import { CircularProgress } from "./CircularProgress";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ScoreCardProps {
  score: number;
  matched: number;
  weak: number;
  missing: number;
  className?: string;
}

export const ScoreCard = ({ score, matched, weak, missing, className }: ScoreCardProps) => {
  const total = matched + weak + missing;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "rounded-2xl bg-card border border-border p-6 shadow-card",
        className
      )}
    >
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Compliance Score</h3>
      <div className="flex items-center gap-6">
        <CircularProgress value={score} />
        <div className="flex-1 space-y-3">
          <StatRow label="Matched" count={matched} total={total} colorClass="bg-success" />
          <StatRow label="Weak" count={weak} total={total} colorClass="bg-warning" />
          <StatRow label="Missing" count={missing} total={total} colorClass="bg-destructive" />
        </div>
      </div>
    </motion.div>
  );
};

const StatRow = ({
  label,
  count,
  total,
  colorClass,
}: {
  label: string;
  count: number;
  total: number;
  colorClass: string;
}) => (
  <div className="space-y-1">
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{count}/{total}</span>
    </div>
    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all duration-700 ease-out", colorClass)}
        style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
      />
    </div>
  </div>
);
