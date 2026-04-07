import { cn } from "@/lib/utils";

export const SkeletonTable = () => (
  <div className="rounded-2xl bg-card border border-border shadow-card overflow-hidden">
    <div className="p-4 space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 animate-pulse-soft">
          <div className={cn("h-4 rounded-md bg-muted", i === 0 ? "w-48" : "w-40")} />
          <div className="h-4 w-20 rounded-md bg-muted" />
          <div className="h-6 w-16 rounded-full bg-muted" />
          <div className="h-2 w-16 rounded-full bg-muted" />
          <div className={cn("h-4 rounded-md bg-muted", i % 2 === 0 ? "w-36" : "w-28")} />
          <div className="h-4 w-4 rounded bg-muted" />
        </div>
      ))}
    </div>
  </div>
);
