import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[14px] border-2 border-transparent bg-clip-padding text-sm font-black whitespace-nowrap transition-all duration-200 outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 tracking-tight",
  {
    variants: {
      variant: {
        default: "bg-indigo-600 text-white shadow-lg shadow-indigo-200/40 hover:bg-indigo-700",
        outline:
          "border-slate-100 bg-white text-slate-600 shadow-sm hover:border-indigo-100 hover:bg-indigo-50/30",
        secondary:
          "bg-white border-2 border-slate-100 text-slate-900 shadow-sm hover:bg-slate-50",
        success:
          "bg-emerald-500 text-white shadow-lg shadow-emerald-200/40 hover:bg-emerald-600",
        ghost:
          "hover:bg-slate-100/80 hover:text-slate-900",
        destructive:
          "bg-rose-500 text-white shadow-lg shadow-rose-200/40 hover:bg-rose-600",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-6 gap-3",
        xs: "h-8 px-4 text-xs gap-1.5",
        sm: "h-10 px-5 text-sm gap-2",
        lg: "h-14 px-8 text-base gap-3",
        icon: "size-12",
        "icon-sm": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface ButtonProps extends ButtonPrimitive.Props, VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

function Button({
  className,
  variant = "default",
  size = "default",
  loading = false,
  children,
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }

