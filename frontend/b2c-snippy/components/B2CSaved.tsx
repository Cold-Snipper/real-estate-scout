"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { B2CPropertyCard } from "./B2CPropertyCard"
import { SavedApartmentDetailSheet } from "./SavedApartmentDetailSheet"
import { getSavedApartments, SAVED_STATUS_OPTIONS, type SavedApartment } from "../lib/saved-apartments"

const statusTabs = [
  { value: "all", label: "All" },
  ...SAVED_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
]

export function B2CSaved() {
  const [list, setList] = useState<SavedApartment[]>([])
  const [loading, setLoading] = useState(true)
  const [detailItem, setDetailItem] = useState<SavedApartment | null>(null)

  const refresh = useCallback(() => {
    setList(getSavedApartments())
  }, [])

  useEffect(() => {
    refresh()
    setLoading(false)
  }, [refresh])

  const byStatus = (status: string) => {
    if (status === "all") return list
    return list.filter((i) => i.savedStatus === status)
  }

  if (loading) {
    return (
      <div className="flex flex-1 flex-col overflow-auto p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-6 aspect-[3/2] w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-border bg-card px-6 py-4">
        <h1 className="text-xl font-semibold tracking-tight">Saved Apartments</h1>
        <p className="text-sm text-muted-foreground">
          Track status, notes, conversation log, and timeline
        </p>
      </header>
      <div className="flex-1 overflow-y-auto p-6">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-4 flex flex-wrap gap-1">
            {statusTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {statusTabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-0">
              {byStatus(tab.value).length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 py-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    {tab.value === "all" ? "No saved apartments yet. Save from Discover." : `No listings in ${tab.label}.`}
                  </p>
                  <Button asChild className="mt-4" variant="outline">
                    <Link href="/b2c-snippy/discover">Discover</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {byStatus(tab.value).map((item) => (
                    <div
                      key={item.id}
                      className="cursor-pointer"
                      onClick={() => setDetailItem(item)}
                    >
                      <B2CPropertyCard
                        item={item}
                        variant="compact"
                        showMatch={!!item.matchPct}
                        showWhyFits={!!item.whyFits}
                      />
                      <p className="mt-1 text-xs text-muted-foreground">{item.savedStatus}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
      <SavedApartmentDetailSheet
        open={!!detailItem}
        onOpenChange={(open) => !open && setDetailItem(null)}
        item={detailItem}
        onUpdate={refresh}
      />
    </div>
  )
}
