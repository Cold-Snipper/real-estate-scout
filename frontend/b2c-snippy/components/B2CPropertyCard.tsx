"use client"

import Image from "next/image"
import Link from "next/link"
import { MapPin, BedDouble, Maximize2, Sparkles } from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { B2CFeedItem } from "../lib/b2c-api"

interface B2CPropertyCardProps {
  item: B2CFeedItem
  variant?: "compact" | "expanded"
  showMatch?: boolean
  showWhyFits?: boolean
  href?: string
  onPass?: () => void
  onSave?: () => void
  onInfo?: () => void
  actionBar?: boolean
}

export function B2CPropertyCard({
  item,
  variant = "expanded",
  showMatch = true,
  showWhyFits = true,
  href,
  onPass,
  onSave,
  onInfo,
  actionBar = false,
}: B2CPropertyCardProps) {
  const photoUrl = item.photo.replace("w=200&h=200", "w=800&h=500")
  const matchPct = item.matchPct ?? Math.round(item.airbnbScore * 10)

  return (
    <Card className={cn("overflow-hidden border-border bg-card shadow-sm", variant === "compact" && "flex flex-row gap-4")}>
      {/* Photo — top 60% in expanded, left thumb in compact */}
      <div
        className={cn(
          "relative bg-muted shrink-0",
          variant === "expanded" ? "aspect-[4/3] w-full" : "aspect-square w-28 rounded-l-xl"
        )}
      >
        <Image
          src={photoUrl}
          alt={item.address}
          fill
          className="object-cover"
          sizes={variant === "expanded" ? "100vw" : "112px"}
        />
        {showMatch && (
          <Badge className="absolute right-2 top-2 bg-success text-success-foreground text-xs font-bold shadow-sm">
            {matchPct}% Perfect Match
          </Badge>
        )}
      </div>

      <CardContent className={cn("flex flex-col gap-2 p-4", variant === "compact" && "flex-1 justify-center py-3")}>
        <div className="flex items-start justify-between gap-2">
          <span className="text-lg font-semibold text-foreground tabular-nums">
            €{item.price.toLocaleString("de-DE")}
          </span>
        </div>
        <h3 className="font-medium text-foreground line-clamp-2">{item.address}</h3>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" />
          <span className="truncate">{item.location}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-xs font-normal">
            <BedDouble className="size-3 mr-0.5" />
            {item.beds} bed
          </Badge>
          <Badge variant="secondary" className="text-xs font-normal">
            <Maximize2 className="size-3 mr-0.5" />
            {item.sqm} m²
          </Badge>
        </div>
        {showWhyFits && item.whyFits && (
          <div className="flex items-start gap-1.5 rounded-md bg-secondary/70 px-2.5 py-1.5">
            <Sparkles className="size-3.5 shrink-0 mt-0.5 text-primary" />
            <p className="text-xs text-muted-foreground leading-snug">{item.whyFits}</p>
          </div>
        )}
      </CardContent>

      {actionBar && (onPass ?? onSave ?? onInfo) && (
        <CardFooter className="flex items-center justify-center gap-4 border-t border-border bg-muted/30 px-4 py-3">
          {onPass && (
            <Button variant="outline" size="icon" className="rounded-full" onClick={onPass} aria-label="Pass">
              <span className="text-lg">✕</span>
            </Button>
          )}
          {onSave && (
            <Button size="icon" className="rounded-full bg-success hover:bg-success/90" onClick={onSave} aria-label="Save">
              <span className="text-lg">♥</span>
            </Button>
          )}
          {onInfo && (
            <Button variant="outline" size="sm" onClick={onInfo}>
              Info
            </Button>
          )}
        </CardFooter>
      )}

      {href && !actionBar && (
        <CardFooter className="border-t border-border p-0">
          <Button variant="outline" className="w-full rounded-t-none" asChild>
            <Link href={href}>View details</Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
