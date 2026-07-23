import { cn } from "@/lib/utils";
import { type HTMLAttributes, forwardRef, type ReactNode } from "react";

export interface FormFieldProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}

const FormField = forwardRef<HTMLDivElement, FormFieldProps>(
  ({ className, label, required, error, children, ...props }, ref) => (
    <div ref={ref} className={cn("space-y-1.5", className)} {...props}>
      <label className="block text-sm font-medium text-zinc-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
);
FormField.displayName = "FormField";

export { FormField };
