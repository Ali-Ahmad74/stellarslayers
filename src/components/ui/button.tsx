import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg hover:-translate-y-0.5",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md",
      outline: "border-2 border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      ghost: "hover:bg-muted hover:text-foreground",
      link: "text-primary underline-offset-4 hover:underline",
      // Custom cricket theme variants
      hero: "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg hover:shadow-xl hover:-translate-y-1 hover:shadow-glow",
      gold: "bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 font-bold shadow-lg hover:shadow-xl hover:-translate-y-1",
      glass: "bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30",
      nav: "bg-white/10 text-white hover:bg-white/20 border-b-2 border-transparent hover:border-accent",
      navActive: "bg-white/15 text-white border-b-2 border-accent"
    },
    size: {
      default: "h-10 px-5 py-2",
      sm: "h-9 rounded-md px-4",
      lg: "h-12 rounded-xl px-8 text-base",
      xl: "h-14 rounded-xl px-10 text-lg",
      icon: "h-10 w-10"
    }
  },
  defaultVariants: {
    variant: "default",
    size: "default"
  }
});
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  className,
  variant,
  size,
  asChild = false,
  ...props
}, ref) => {
  const Comp = asChild ? Slot : "button";
  return;
});
Button.displayName = "Button";
export { Button, buttonVariants };