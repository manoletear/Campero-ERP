import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { type HTMLAttributes, forwardRef } from "react";

const badgeVariants = cva(
  "inline-flex items-center rounded-full font-medium",
  {
    variants: {
      variant: {
        success: "bg-emerald-50 text-emerald-700",
        warning: "bg-amber-50 text-amber-700",
        danger: "bg-red-50 text-red-700",
        info: "bg-blue-50 text-blue-700",
        neutral: "bg-zinc-100 text-zinc-600",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-1 text-xs",
      },
    },
    defaultVariants: {
      variant: "neutral",
      size: "sm",
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant, size, className }))}
      {...props}
    />
  )
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
