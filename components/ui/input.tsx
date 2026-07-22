import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, value, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      value={value ?? ""}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-2 text-base font-bold text-slate-900 transition-all duration-200 outline-none placeholder:text-slate-400 placeholder:font-medium focus-visible:border-indigo-500 focus-visible:ring-4 focus-visible:ring-indigo-500/10 focus-visible:shadow-sm disabled:bg-slate-50 disabled:text-slate-500 aria-invalid:border-rose-500 aria-invalid:ring-rose-500/10 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
