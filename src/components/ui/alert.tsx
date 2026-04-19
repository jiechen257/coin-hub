import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-md border px-4 py-3 text-sm",
  {
    variants: {
      variant: {
        default: "border-border/80 bg-secondary/60 text-secondary-foreground",
        success: "border-primary/25 bg-primary/12 text-foreground",
        destructive:
          "border-destructive/25 bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"h5">) {
  return <h5 className={cn("mb-1 font-medium leading-none", className)} {...props} />;
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("text-sm leading-6 [&_p]:leading-6", className)}
      {...props}
    />
  );
}

export { Alert, AlertDescription, AlertTitle };
