import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { type HTMLAttributes, forwardRef } from "react";

export interface LoadingProps extends HTMLAttributes<HTMLDivElement> {
  /** Render as full-page centered spinner when true, inline spinner when false */
  fullPage?: boolean;
  /** Size of the spinner icon in Tailwind classes */
  spinnerClassName?: string;
}

const Loading = forwardRef<HTMLDivElement, LoadingProps>(
  ({ className, fullPage = true, spinnerClassName, ...props }, ref) => {
    if (!fullPage) {
      return (
        <div
          ref={ref}
          className={cn("inline-flex items-center justify-center", className)}
          {...props}
        >
          <Loader2
            className={cn("h-5 w-5 animate-spin text-zinc-500", spinnerClassName)}
          />
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex w-full items-center justify-center py-20",
          className
        )}
        {...props}
      >
        <Loader2
          className={cn("h-8 w-8 animate-spin text-zinc-400", spinnerClassName)}
        />
      </div>
    );
  }
);
Loading.displayName = "Loading";

export { Loading };
