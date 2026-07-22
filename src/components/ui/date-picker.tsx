import * as React from "react"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import { forceEnglishDigits } from "../../lib/numberUtils"

export function DatePicker({
  date,
  setDate,
  placeholder = "اختر التاريخ...",
  className,
}: {
  date?: Date
  setDate: (date?: Date) => void
  placeholder?: string
  className?: string
}) {
  return (
    <Popover>
      <PopoverTrigger render={
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-right font-bold h-11 rounded-xl border-slate-200 hover:border-slate-300 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all px-4",
            !date && "text-slate-400 font-medium",
            className
          )}
        >
          <CalendarIcon className="ml-2 h-4 w-4 text-slate-400" />
          {date ? (
            <span className="font-mono tracking-tight">
              {forceEnglishDigits(format(date, "PPP", { locale: ar }))}
            </span>
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      } />
      <PopoverContent className="w-auto p-0 rounded-[14px] border-slate-100 shadow-2xl" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          initialFocus
          locale={ar}
          className="rounded-[14px]"
        />
      </PopoverContent>
    </Popover>
  )
}
