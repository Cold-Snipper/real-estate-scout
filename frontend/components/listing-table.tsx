"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import { type Listing, type ListingStatus, STATUS_OPTIONS } from "@/lib/listings-data"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className="inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
        —
      </span>
    )
  }
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums",
        score >= 7.5 && "bg-score-green/15 text-score-green",
        score >= 5 && score < 7.5 && "bg-score-orange/15 text-score-orange",
        score < 5 && "bg-score-red/15 text-score-red"
      )}
    >
      {score.toFixed(1)}
    </span>
  )
}

function StatusSelect({
  value,
  onChange,
}: {
  value: ListingStatus
  onChange: (val: ListingStatus) => void
}) {
  const statusColors: Record<ListingStatus, string> = {
    New: "text-primary",
    Reviewing: "text-score-orange",
    Contacted: "text-score-green",
    Viewing: "text-[hsl(260_50%_55%)]",
    Passed: "text-muted-foreground",
  }

  return (
    <Select value={value} onValueChange={(v) => onChange(v as ListingStatus)}>
      <SelectTrigger
        className={cn(
          "h-7 w-[110px] border-none bg-transparent shadow-none text-xs font-medium px-2",
          statusColors[value]
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((s) => (
          <SelectItem key={s} value={s} className="text-xs">
            {s}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

interface ListingTableProps {
  listings: Listing[]
  onRowClick: (listing: Listing) => void
  onStatusChange: (id: string, status: ListingStatus) => void
  selectedId?: string
}

export function ListingTable({
  listings,
  onRowClick,
  onStatusChange,
  selectedId,
}: ListingTableProps) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="text-left font-medium text-muted-foreground px-4 py-3 w-10" />
              <th className="text-left font-medium text-muted-foreground px-4 py-3">
                Property
              </th>
              <th className="text-left font-medium text-muted-foreground px-4 py-3">
                Price
              </th>
              <th className="text-center font-medium text-muted-foreground px-4 py-3">
                Bedrooms
              </th>
              <th className="text-center font-medium text-muted-foreground px-4 py-3">
                {"m²"}
              </th>
              <th className="text-center font-medium text-muted-foreground px-4 py-3">
                Airbnb Score
              </th>
              <th className="text-center font-medium text-muted-foreground px-4 py-3">
                Days
              </th>
              <th className="text-left font-medium text-muted-foreground px-4 py-3">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {listings.map((listing) => (
              <tr
                key={listing.id}
                onClick={() => onRowClick(listing)}
                className={cn(
                  "border-b border-border last:border-b-0 cursor-pointer transition-colors",
                  selectedId === listing.id
                    ? "bg-primary/8"
                    : "hover:bg-secondary/50"
                )}
              >
                <td className="px-4 py-3">
                  <div className="size-10 rounded-md overflow-hidden bg-muted shrink-0">
                    {listing.photo ? (
                      <Image
                        src={listing.photo}
                        alt={listing.address}
                        width={40}
                        height={40}
                        className="size-10 object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="size-10 bg-muted" />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">
                      {listing.address}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {listing.location}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-foreground tabular-nums">
                  {"€"}{listing.price.toLocaleString("de-DE")}
                </td>
                <td className="px-4 py-3 text-center text-foreground tabular-nums">
                  {listing.beds}
                </td>
                <td className="px-4 py-3 text-center text-foreground tabular-nums">
                  {listing.sqm}
                </td>
                <td className="px-4 py-3 text-center">
                  <ScoreBadge score={listing.airbnbScore} />
                </td>
                <td className="px-4 py-3 text-center text-muted-foreground tabular-nums">
                  {listing.daysOnMarket}
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <StatusSelect
                    value={listing.status}
                    onChange={(status) => onStatusChange(listing.id, status)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {listings.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <p className="text-sm font-medium">No listings match your filters</p>
          <p className="text-xs mt-1">Try adjusting your search criteria</p>
        </div>
      )}
    </div>
  )
}
