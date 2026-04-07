import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StatusBadge } from "./StatusBadge";
import { AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface ComplianceRow {
  id: string;
  requirement: string;
  category: string;
  status: "Matched" | "Weak" | "Missing";
  confidence: number;
  matchedText: string;
  reason: string;
  riskFlag: boolean;
}

interface ResultTableProps {
  data: ComplianceRow[];
  filter: string;
}

export const ResultTable = ({ data, filter }: ResultTableProps) => {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [selectedRisk, setSelectedRisk] = useState<ComplianceRow | null>(null);

  const filtered = filter === "All" ? data : data.filter((r) => r.status === filter);

  if (filtered.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl bg-card border border-border p-12 text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <Info className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="text-foreground font-medium">No results found</p>
        <p className="text-sm text-muted-foreground mt-1">
          {filter !== "All"
            ? `No requirements with "${filter}" status`
            : "Upload documents to see compliance results"}
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="rounded-2xl bg-card border border-border shadow-card overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {["Requirement", "Category", "Status", "Confidence", "Matched Text", "Risk"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filtered.map((row, i) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.03 }}
                  onMouseEnter={() => setHoveredRow(row.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  className={cn(
                    "border-b border-border/50 transition-colors",
                    hoveredRow === row.id && "bg-muted/50",
                    row.riskFlag && "border-l-2 border-l-destructive"
                  )}
                >
                  <td className="px-4 py-3.5 text-sm font-medium text-foreground max-w-[200px]">
                    <p className="truncate">{row.requirement}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">
                      {row.category}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            row.confidence >= 80
                              ? "bg-success"
                              : row.confidence >= 50
                              ? "bg-warning"
                              : "bg-destructive"
                          )}
                          style={{ width: `${row.confidence}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-8">
                        {row.confidence}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground max-w-[200px]">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="truncate cursor-help">{row.matchedText || "—"}</p>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">{row.matchedText || "No matching text found"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </td>
                  <td className="px-4 py-3.5">
                    {row.riskFlag && (
                      <button
                        type="button"
                        onClick={() => setSelectedRisk(row)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        View
                      </button>
                    )}
                    {!row.riskFlag && <span className="text-xs text-muted-foreground">-</span>}
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      <Dialog
        open={Boolean(selectedRisk)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRisk(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Risk Details</DialogTitle>
            <DialogDescription>
              Review the requirement, confidence, and matching context before deciding next actions.
            </DialogDescription>
          </DialogHeader>

          {selectedRisk && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-md bg-muted p-2">
                  <p className="text-muted-foreground">Category</p>
                  <p className="font-medium text-foreground mt-1">{selectedRisk.category}</p>
                </div>
                <div className="rounded-md bg-muted p-2">
                  <p className="text-muted-foreground">Status / Confidence</p>
                  <p className="font-medium text-foreground mt-1">
                    {selectedRisk.status} / {selectedRisk.confidence}%
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Requirement</p>
                <p className="rounded-md border bg-muted/40 p-3 text-foreground whitespace-pre-wrap">
                  {selectedRisk.requirement}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Risk Reason</p>
                <p className="rounded-md border bg-muted/40 p-3 text-foreground whitespace-pre-wrap">
                  {selectedRisk.reason}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Matched Text</p>
                <p className="rounded-md border bg-muted/40 p-3 text-foreground whitespace-pre-wrap">
                  {selectedRisk.matchedText || "No matching text found in proposal."}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};
