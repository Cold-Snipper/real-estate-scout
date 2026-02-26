"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { B2CPropertyCard } from "./B2CPropertyCard"
import { B2CFilterDrawer, type B2CFilterState } from "./B2CFilterDrawer"
import { LetBotHelpDialog } from "./LetBotHelpDialog"
import { SaveOnYesSheet } from "./SaveOnYesSheet"
import { getFeed, type B2CFeedItem } from "../lib/b2c-api"
import { useB2CUser } from "../lib/b2c-user-context"
import { saveApartment } from "../lib/saved-apartments"
import { useToast } from "@/hooks/use-toast"

const defaultFilters: B2CFilterState = {
  locations: [],
  communes: [],
  priceMin: "",
  priceMax: "",
  bedrooms: "any",
  sqmMin: "",
  sqmMax: "",
  minScore: 6,
}

export function B2CDiscover() {
  const [list, setList] = useState<B2CFeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filters, setFilters] = useState<B2CFilterState>(defaultFilters)
  const [index, setIndex] = useState(0)
  const [saveSheet, setSaveSheet] = useState<B2CFeedItem | null>(null)
  const [botDialog, setBotDialog] = useState<{ id: string; address: string; contactGoal?: import("../lib/b2c-api").ContactGoal } | null>(null)
  const [hasShownPersonalisedToast, setHasShownPersonalisedToast] = useState(false)
  const { toast } = useToast()
  const { profile } = useB2CUser()

  useEffect(() => {
    getFeed()
      .then(setList)
      .finally(() => setLoading(false))
  }, [])

  const current = list[index]
  const filteredList = list.filter((item) => {
    if (filters.priceMin && item.price < Number(filters.priceMin)) return false
    if (filters.priceMax && item.price > Number(filters.priceMax)) return false
    if (item.airbnbScore < filters.minScore) return false
    return true
  })
  const currentFiltered = filteredList[index]

  const handlePass = () => {
    setIndex((i) => Math.min(i + 1, list.length - 1))
  }

  const handleSave = () => {
    if (currentFiltered) setSaveSheet(currentFiltered)
  }

  const handleSaveConfirm = (opts: { botOutreach: boolean; contactGoal?: import("../lib/b2c-api").ContactGoal }) => {
    if (!currentFiltered) return
    saveApartment(currentFiltered, {
      botOutreach: opts.botOutreach,
      contactGoal: opts.contactGoal,
    })
    setIndex((i) => Math.min(i + 1, list.length - 1))
    setSaveSheet(null)
    if (!hasShownPersonalisedToast) {
      toast({ title: "Saved", description: "Your matches are now personalised." })
      setHasShownPersonalisedToast(true)
    }
    if (opts.botOutreach && opts.contactGoal) {
      setBotDialog({ id: currentFiltered.id, address: currentFiltered.address, contactGoal: opts.contactGoal })
    }
  }

  const handleInfo = () => {
    if (currentFiltered) {
      setBotDialog({ id: currentFiltered.id, address: currentFiltered.address })
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center gap-2 border-b border-border bg-card px-4 py-3">
          <Skeleton className="h-9 flex-1 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
          <p className="text-center font-medium text-muted-foreground">Loading personalised matches…</p>
          <Skeleton className="aspect-[4/3] w-full max-w-md rounded-xl" />
        </div>
      </div>
    )
  }

  if (list.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground text-center">No listings yet. Complete onboarding to get matches.</p>
        <Button asChild>
          <Link href="/b2c-snippy/onboarding">Set preferences</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-2 border-b border-border bg-card px-4 py-3">
        <Input placeholder="Search…" className="flex-1" readOnly />
        <Button variant="outline" size="sm" onClick={() => setFilterOpen(true)}>
          <Filter className="size-4 mr-1" />
          Refine
        </Button>
        <B2CFilterDrawer
          open={filterOpen}
          onOpenChange={setFilterOpen}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {currentFiltered ? (
          <div className="mx-auto max-w-md">
            <B2CPropertyCard
              item={currentFiltered}
              variant="expanded"
              showMatch
              showWhyFits
              actionBar
              onPass={handlePass}
              onSave={handleSave}
              onInfo={handleInfo}
            />
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {index + 1} of {filteredList.length}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <p className="text-muted-foreground">You’ve seen all matches. Refine filters or check back later.</p>
            <Button variant="outline" onClick={() => setIndex(0)}>
              Start over
            </Button>
          </div>
        )}
      </div>

      <SaveOnYesSheet
        open={!!saveSheet}
        onOpenChange={(open) => !open && setSaveSheet(null)}
        item={saveSheet}
        onSave={handleSaveConfirm}
      />
      <LetBotHelpDialog
        open={!!botDialog}
        onOpenChange={(open) => !open && setBotDialog(null)}
        listingId={botDialog?.id ?? ""}
        listingAddress={botDialog?.address}
        contactGoal={botDialog?.contactGoal}
        userProfile={{ name: profile.name }}
      />
    </div>
  )
}
