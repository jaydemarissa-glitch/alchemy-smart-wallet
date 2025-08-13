import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingSpinner({ className, size = "md" }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8"
  };

  return (
    <div className={cn("border-4 border-primary border-t-transparent rounded-full animate-spin", sizeClasses[size], className)} />
  );
}

export function LoadingCard({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-center p-8", className)}>
      <div className="flex flex-col items-center space-y-4">
        <LoadingSpinner size="lg" />
        {children}
      </div>
    </div>
  );
}
