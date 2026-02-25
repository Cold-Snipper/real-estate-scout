"use client"

import Image from "next/image"
import { ExternalLink, MapPin, BedDouble, Maximize2, Calendar, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { type Listing, type ListingStatus } from "@/lib/listings-data"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"

function ScoreBar({ label, score, reasoning }: { label: string; score: number; reasoning: string }) {
  const pct = (score / 10) * 100
  const barColor =
    score >= 7.5
      ? "bg-score-green"
      : score >= 5
        ? "bg-score-orange"
        : "bg-score-red"

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span
          className={cn(
            "text-sm font-semibold tabular-nums",
            score >= 7.5 && "text-score-green",
            score >= 5 && score < 7.5 && "text-score-orange",
            score < 5 && "text-score-red"
          )}
        >
          {score.toFixed(1)}/10
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{reasoning}</p>
    </div>
  )
}

interface ListingDrawerProps {
  listing: Listing | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusChange: (id: string, status: ListingStatus) => void
}

export function ListingDrawer({
  listing,
  open,
  onOpenChange,
  onStatusChange,
}: ListingDrawerProps) {
  if (!listing) return null

  const overallScoreColor =
    listing.airbnbScore >= 7.5
      ? "text-score-green"
      : listing.airbnbScore >= 5
        ? "text-score-orange"
        : "text-score-red"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[480px] p-0 flex flex-col gap-0"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{listing.address}</SheetTitle>
          <SheetDescription>Property details for {listing.address}</SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="flex flex-col">
            {/* Hero image */}
            <div className="relative aspect-[16/10] w-full bg-muted">
              <Image
                src={listing.photo.replace("w=200&h=200", "w=800&h=500")}
                alt={listing.address}
                fill
                className="object-cover"
              />
            </div>

            {/* Property info */}
            <div className="flex flex-col gap-5 p-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground text-balance">
                  {listing.address}
                </h2>
                <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                  <MapPin className="size-3.5" />
                  {listing.location}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="flex flex-col items-center rounded-lg bg-secondary/70 p-3">
                  <span className="text-lg font-semibold text-foreground tabular-nums">
                    {"€"}{listing.price.toLocaleString("de-DE")}
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-0.5">Price</span>
                </div>
                <div className="flex flex-col items-center rounded-lg bg-secondary/70 p-3">
                  <div className="flex items-center gap-1">
                    <BedDouble className="size-4 text-foreground" />
                    <span className="text-lg font-semibold text-foreground tabular-nums">
                      {listing.beds}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-0.5">Beds</span>
                </div>
                <div className="flex flex-col items-center rounded-lg bg-secondary/70 p-3">
                  <div className="flex items-center gap-1">
                    <Maximize2 className="size-3.5 text-foreground" />
                    <span className="text-lg font-semibold text-foreground tabular-nums">
                      {listing.sqm}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-0.5">{"m²"}</span>
                </div>
                <div className="flex flex-col items-center rounded-lg bg-secondary/70 p-3">
                  <div className="flex items-center gap-1">
                    <Calendar className="size-3.5 text-foreground" />
                    <span className="text-lg font-semibold text-foreground tabular-nums">
                      {listing.daysOnMarket}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-0.5">Days</span>
                </div>
              </div>

              {/* AI Score Breakdown */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">
                    AI Score Breakdown
                  </h3>
                  <span className={cn("ml-auto text-xl font-bold tabular-nums", overallScoreColor)}>
                    {listing.airbnbScore.toFixed(1)}
                  </span>
                </div>

                <div className="flex flex-col gap-5">
                  {listing.aiBreakdown.map((dim) => (
                    <ScoreBar
                      key={dim.label}
                      label={dim.label}
                      score={dim.score}
                      reasoning={dim.reasoning}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer actions */}
        <div className="flex items-center gap-3 border-t border-border p-4 bg-card">
          <Button variant="outline" className="flex-1 gap-2" asChild>
            <a href="#" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5" />
              View listing
            </a>
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              onStatusChange(listing.id, "Contacted")
              onOpenChange(false)
            }}
          >
            Mark as Contacted
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
