"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { MessageSquare, StickyNote, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { B2CPropertyCard } from "./B2CPropertyCard"
import { LetBotHelpDialog } from "./LetBotHelpDialog"
import type { SavedApartment } from "../lib/saved-apartments"
import { useB2CUser } from "../lib/b2c-user-context"
import {
  updateSavedApartment,
  addTimelineEntry,
  SAVED_STATUS_OPTIONS,
} from "../lib/saved-apartments"

interface SavedApartmentDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: SavedApartment | null
  onUpdate?: () => void
}

export function SavedApartmentDetailSheet({
  open,
  onOpenChange,
  item,
  onUpdate,
}: SavedApartmentDetailSheetProps) {
  const [notes, setNotes] = useState("")
  const [botDialog, setBotDialog] = useState(false)
  const activeItem = item ?? undefined
  const { profile } = useB2CUser()

  useEffect(() => {
    if (activeItem) setNotes(activeItem.notes ?? "")
  }, [activeItem?.id, activeItem?.notes])

  const handleStatusChange = (value: string) => {
    if (!activeItem) return
    updateSavedApartment(activeItem.id, { savedStatus: value as SavedApartment["savedStatus"] })
    addTimelineEntry(activeItem.id, {
      type: "status",
      label: `Status: ${value}`,
      detail: `Updated to ${value}`,
    })
    onUpdate?.()
  }

  const handleNotesBlur = () => {
    if (!activeItem) return
    updateSavedApartment(activeItem.id, { notes })
    onUpdate?.()
  }

  if (!activeItem) return null

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>{activeItem.address}</SheetTitle>
            <SheetDescription>
              Status, notes, conversation log, and timeline
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-6 pb-8">
            <B2CPropertyCard
              item={activeItem}
              variant="compact"
              showMatch={!!activeItem.matchPct}
              showWhyFits={!!activeItem.whyFits}
              href={`/b2c-snippy/property/${activeItem.id}`}
            />
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={activeItem.savedStatus}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SAVED_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <StickyNote className="size-4" />
                Notes
              </Label>
              <Textarea
                placeholder="Add notes about this property…"
                value={notes || activeItem.notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
                className="min-h-[80px]"
              />
            </div>
            {activeItem.conversationLog.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MessageSquare className="size-4" />
                  Conversation log
                </Label>
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 max-h-40 overflow-y-auto">
                  {activeItem.conversationLog.map((c) => (
                    <div
                      key={c.id}
                      className={`text-sm ${c.role === "agent" ? "text-muted-foreground" : ""}`}
                    >
                      <span className="font-medium capitalize">{c.role}: </span>
                      {c.text}
                      <span className="ml-2 text-xs text-muted-foreground">{c.at}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeItem.timeline.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="size-4" />
                  Timeline
                </Label>
                <div className="space-y-1 rounded-lg border border-border bg-muted/30 p-4 max-h-40 overflow-y-auto">
                  {[...activeItem.timeline].reverse().map((t) => (
                    <div key={t.id} className="text-sm">
                      <span className="font-medium">{t.label}</span>
                      {t.detail && <span className="text-muted-foreground"> — {t.detail}</span>}
                      <span className="ml-2 text-xs text-muted-foreground">{t.at}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button asChild variant="outline" className="flex-1">
                <Link href={`/b2c-snippy/property/${activeItem.id}`}>View details</Link>
              </Button>
              <Button
                className="flex-1"
                onClick={() => setBotDialog(true)}
              >
                Let bot contact
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <LetBotHelpDialog
        open={botDialog}
        onOpenChange={setBotDialog}
        listingId={activeItem.id}
        listingAddress={activeItem.address}
        contactGoal={activeItem.contactGoal}
        userProfile={{ name: profile.name }}
      />
    </>
  )
}
