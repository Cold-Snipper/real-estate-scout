"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { B2CPropertyCard } from "./B2CPropertyCard"
import { LetBotHelpDialog } from "./LetBotHelpDialog"
import { getAlerts, ignoreAlert, type B2CFeedItem } from "../lib/b2c-api"
import { saveApartment } from "../lib/saved-apartments"
import { useB2CUser } from "../lib/b2c-user-context"

export function B2CAlerts() {
  const [list, setList] = useState<B2CFeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [botDialog, setBotDialog] = useState<{ id: string; address: string } | null>(null)
  const { profile } = useB2CUser()

  const refresh = useCallback(() => {
    getAlerts().then(setList).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleIgnore = (id: string) => {
    ignoreAlert(id)
    setList((prev) => prev.filter((i) => i.id !== id))
  }

  const handleContactManually = (item: B2CFeedItem) => {
    saveApartment(item, { botOutreach: false })
    handleIgnore(item.id)
  }

  if (loading) {
    return (
      <div className="flex flex-1 flex-col overflow-auto p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="mt-6 h-32 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-border bg-card px-6 py-4">
        <h1 className="text-xl font-semibold tracking-tight">Alerts</h1>
        <p className="text-sm text-muted-foreground">
          New listings that strongly match your preferences
        </p>
      </header>
      <div className="flex-1 overflow-y-auto p-6">
        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 py-12 text-center">
            <p className="text-sm text-muted-foreground">No new alerts right now. We’ll notify you when something matches.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {list.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
                <B2CPropertyCard
                  item={item}
                  variant="compact"
                  showMatch
                  showWhyFits
                />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="ghost" onClick={() => handleIgnore(item.id)}>
                    Ignore
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/b2c-snippy/property/${item.id}`}>View</Link>
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleContactManually(item)}>
                    Contact manually
                  </Button>
                  <Button size="sm" onClick={() => setBotDialog({ id: item.id, address: item.address })}>
                    Let bot contact
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <LetBotHelpDialog
        open={!!botDialog}
        onOpenChange={(open) => !open && setBotDialog(null)}
        listingId={botDialog?.id ?? ""}
        listingAddress={botDialog?.address}
        userProfile={{ name: profile.name }}
      />
    </div>
  )
}
