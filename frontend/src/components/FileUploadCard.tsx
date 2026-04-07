import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadCardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  onFileSelect?: (file: File | null) => void;
  accept?: string;
  className?: string;
}

export const FileUploadCard = ({
  title,
  description,
  icon,
  onFileSelect,
  accept = ".pdf,.txt,.doc,.docx",
  className,
}: FileUploadCardProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (f: File) => {
      setFile(f);
      onFileSelect?.(f);
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const removeFile = () => {
    setFile(null);
    onFileSelect?.(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "group rounded-2xl bg-card border-2 border-dashed border-border p-8 text-center transition-all duration-300 hover:shadow-card-hover",
        isDragging && "border-primary bg-accent scale-[1.02]",
        file && "border-solid border-primary/30 bg-accent/50",
        className
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {!file ? (
        <label className="cursor-pointer flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center text-primary transition-transform group-hover:scale-110">
            {icon || <Upload className="w-6 h-6" />}
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">{title}</p>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
          <div className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium transition-all hover:opacity-90">
            Browse Files
          </div>
          <p className="text-xs text-muted-foreground">PDF, TXT, DOC up to 10MB</p>
          <input
            type="file"
            className="hidden"
            accept={accept}
            onChange={handleChange}
          />
        </label>
      ) : (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-primary">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <button
            onClick={removeFile}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </motion.div>
  );
};
