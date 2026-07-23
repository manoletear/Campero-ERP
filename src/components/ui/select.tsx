import { cn } from "@/lib/utils";
import { type SelectHTMLAttributes, forwardRef } from "react";

export type SelectOption = string | { value: string; label: string };

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, placeholder, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "w-full rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:opacity-50 disabled:pointer-events-none",
        className
      )}
      {...props}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((opt) => {
        const value = typeof opt === "string" ? opt : opt.value;
        const label = typeof opt === "string" ? opt : opt.label;
        return (
          <option key={value} value={value}>
            {label}
          </option>
        );
      })}
    </select>
  )
);
Select.displayName = "Select";

export { Select };
