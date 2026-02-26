"use client"

import { HelpCircle } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface HelpTooltipProps {
  content: string
}

export function HelpTooltip({ content }: HelpTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-help text-muted-foreground hover:text-primary transition-colors ml-0.5">
          <HelpCircle className="size-3.5" aria-hidden />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[280px] text-xs leading-relaxed">
        {content}
      </TooltipContent>
    </Tooltip>
  )
}
