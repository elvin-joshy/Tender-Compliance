import { cn } from "@/lib/utils";

type Status = "Matched" | "Weak" | "Missing";

const statusStyles: Record<Status, string> = {
  Matched: "bg-success/10 text-success border-success/20",
  Weak: "bg-warning/10 text-warning border-warning/20",
  Missing: "bg-destructive/10 text-destructive border-destructive/20",
};

const statusDots: Record<Status, string> = {
  Matched: "bg-success",
  Weak: "bg-warning",
  Missing: "bg-destructive",
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export const StatusBadge = ({ status, className }: StatusBadgeProps) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
      statusStyles[status],
      className
    )}
  >
    <span className={cn("w-1.5 h-1.5 rounded-full", statusDots[status])} />
    {status}
  </span>
);
