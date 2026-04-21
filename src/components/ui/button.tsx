import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-[transform,background-color,border-color,color,box-shadow] duration-200 ease-out outline-none ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.99] [&_svg]:pointer-events-none [&_svg]:shrink-0 focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_16px_32px_-18px_rgba(14,165,233,0.68)] hover:-translate-y-0.5 hover:bg-primary/92",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[0_12px_24px_-18px_rgba(148,163,184,0.45)] hover:-translate-y-0.5 hover:bg-secondary/88",
        outline:
          "border border-border/80 bg-card/80 text-foreground shadow-[0_12px_24px_-20px_rgba(15,23,42,0.28)] hover:-translate-y-0.5 hover:bg-accent/85 hover:text-accent-foreground",
        ghost:
          "text-foreground hover:bg-accent/80 hover:text-accent-foreground",
        destructive:
          "bg-destructive text-white shadow-[0_16px_32px_-18px_rgba(220,38,38,0.52)] hover:-translate-y-0.5 hover:bg-destructive/92",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-11 px-3 sm:h-9",
        lg: "h-12 px-5",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
