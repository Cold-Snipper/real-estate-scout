"use client"

import { use, useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { MapPin, BedDouble, Maximize2, Calendar, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getProperty } from "../lib/b2c-api"
import type { Listing } from "../lib/listings-data"
import { LetBotHelpDialog } from "./LetBotHelpDialog"

export function B2CPropertyDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [botOpen, setBotOpen] = useState(false)

  useEffect(() => {
    getProperty(id).then((l) => {
      setListing(l ?? null)
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return (
      <div className="flex flex-1 flex-col overflow-auto p-6">
        <Skeleton className="aspect-[4/3] w-full rounded-xl" />
        <Skeleton className="mt-4 h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-full" />
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">Listing not found.</p>
        <Button asChild variant="outline">
          <Link href="/b2c-snippy/discover">Back to Discover</Link>
        </Button>
      </div>
    )
  }

  const photoUrl = listing.photo.replace("w=200&h=200", "w=800&h=500")

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <div className="relative aspect-[4/3] w-full shrink-0 bg-muted">
        <Image src={photoUrl} alt={listing.address} fill className="object-cover" />
      </div>
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{listing.address}</h1>
          <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5" />
            {listing.location}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="border-border">
            <CardContent className="flex flex-col items-center gap-0.5 pt-4">
              <span className="text-lg font-semibold tabular-nums">€{listing.price.toLocaleString("de-DE")}</span>
              <span className="text-xs text-muted-foreground">Price</span>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="flex flex-col items-center gap-0.5 pt-4">
              <div className="flex items-center gap-1">
                <BedDouble className="size-4" />
                <span className="text-lg font-semibold">{listing.beds}</span>
              </div>
              <span className="text-xs text-muted-foreground">Beds</span>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="flex flex-col items-center gap-0.5 pt-4">
              <div className="flex items-center gap-1">
                <Maximize2 className="size-4" />
                <span className="text-lg font-semibold">{listing.sqm} m²</span>
              </div>
              <span className="text-xs text-muted-foreground">Surface</span>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="flex flex-col items-center gap-0.5 pt-4">
              <Calendar className="size-4" />
              <span className="text-lg font-semibold">{listing.daysOnMarket}</span>
              <span className="text-xs text-muted-foreground">Days on market</span>
            </CardContent>
          </Card>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button className="flex-1 gap-2" onClick={() => setBotOpen(true)}>
            Let bot help
          </Button>
          <Button variant="outline" className="flex-1 gap-2" asChild>
            <a href="#" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
              View original listing
            </a>
          </Button>
        </div>
      </div>
      <LetBotHelpDialog
        open={botOpen}
        onOpenChange={setBotOpen}
        listingId={listing.id}
        listingAddress={listing.address}
      />
    </div>
  )
}
