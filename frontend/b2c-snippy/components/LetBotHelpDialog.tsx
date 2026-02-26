"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { draftBotMessage, type ContactGoal } from "../lib/b2c-api"

const contactGoals: { value: ContactGoal; label: string }[] = [
  { value: "book_call", label: "Book a call" },
  { value: "book_viewing", label: "Book a viewing" },
  { value: "request_info", label: "Request more information" },
]

interface LetBotHelpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  listingId: string
  listingAddress?: string
  contactGoal?: ContactGoal
  userProfile?: { name?: string; tone?: string }
  onSend?: (message: string, contactGoal?: ContactGoal) => void
}

export function LetBotHelpDialog({
  open,
  onOpenChange,
  listingId,
  listingAddress,
  contactGoal: initialGoal,
  userProfile,
  onSend,
}: LetBotHelpDialogProps) {
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [goal, setGoal] = useState<ContactGoal>(initialGoal ?? "book_viewing")

  useEffect(() => {
    if (open && listingId) {
      setGoal(initialGoal ?? "book_viewing")
      setLoading(true)
      draftBotMessage(listingId, undefined, initialGoal ?? "book_viewing", userProfile)
        .then(setMessage)
        .finally(() => setLoading(false))
    }
  }, [open, listingId, initialGoal, userProfile])

  const handleGoalChange = (g: ContactGoal) => {
    setGoal(g)
    if (!loading) {
      setLoading(true)
      draftBotMessage(listingId, undefined, g, userProfile).then(setMessage).finally(() => setLoading(false))
    }
  }

  const handleSend = () => {
    onSend?.(message, goal)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Let bot help</DialogTitle>
          <DialogDescription>
            Edit the message below. We’ll send it to the agent for {listingAddress ?? "this listing"}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Contact goal</Label>
            <RadioGroup value={goal} onValueChange={(v) => handleGoalChange(v as ContactGoal)} className="grid grid-cols-1 gap-2">
              {contactGoals.map((g) => (
                <Label key={g.value} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <RadioGroupItem value={g.value} />
                  {g.label}
                </Label>
              ))}
            </RadioGroup>
          </div>
          {loading ? (
            <div className="min-h-[120px] rounded-md bg-muted animate-pulse" />
          ) : (
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[120px] resize-none"
              placeholder="Your message to the agent…"
            />
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={loading || !message.trim()}>
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
