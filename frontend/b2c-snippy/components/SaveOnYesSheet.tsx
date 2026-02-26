"use client"

import { useState } from "react"
import { Bot, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import type { B2CFeedItem } from "../lib/b2c-api"
import type { ContactGoal } from "../lib/b2c-api"

interface SaveOnYesSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: B2CFeedItem | null
  onSave: (opts: {
    botOutreach: boolean
    contactGoal?: ContactGoal
  }) => void
}

const contactGoals: { value: ContactGoal; label: string }[] = [
  { value: "book_call", label: "Book a call" },
  { value: "book_viewing", label: "Book a viewing" },
  { value: "request_info", label: "Request more information" },
]

export function SaveOnYesSheet({
  open,
  onOpenChange,
  item,
  onSave,
}: SaveOnYesSheetProps) {
  const [mode, setMode] = useState<"bot" | "manual">("bot")
  const [goal, setGoal] = useState<ContactGoal>("book_viewing")

  const handleConfirm = () => {
    onSave({
      botOutreach: mode === "bot",
      contactGoal: mode === "bot" ? goal : undefined,
    })
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Save & contact</SheetTitle>
          <SheetDescription>
            {item ? (
              <>
                You’re saving <strong>{item.address}</strong>. How would you like to proceed?
              </>
            ) : (
              "How would you like to proceed with this listing?"
            )}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-6 pb-8">
          <RadioGroup
            value={mode}
            onValueChange={(v) => setMode(v as "bot" | "manual")}
            className="grid gap-3"
          >
            <Label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <RadioGroupItem value="bot" className="mt-0.5" />
              <div className="flex items-center gap-2">
                <Bot className="size-4 text-primary" />
                <div>
                  <span className="font-medium">Let bot reach out</span>
                  <p className="text-xs text-muted-foreground">Bot contacts the agent on your behalf.</p>
                </div>
              </div>
            </Label>
            <Label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <RadioGroupItem value="manual" className="mt-0.5" />
              <div className="flex items-center gap-2">
                <User className="size-4" />
                <div>
                  <span className="font-medium">I’ll contact manually</span>
                  <p className="text-xs text-muted-foreground">You reach out yourself. We’ll track it in Saved Apartments.</p>
                </div>
              </div>
            </Label>
          </RadioGroup>

          {mode === "bot" && (
            <div className="space-y-3">
              <Label>Contact goal</Label>
              <RadioGroup
                value={goal}
                onValueChange={(v) => setGoal(v as ContactGoal)}
                className="grid gap-2"
              >
                {contactGoals.map((g) => (
                  <Label key={g.value} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-4 py-2 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <RadioGroupItem value={g.value} />
                    {g.label}
                  </Label>
                ))}
              </RadioGroup>
            </div>
          )}

          <Button className="w-full" onClick={handleConfirm}>
            Save & {mode === "bot" ? "Let bot contact" : "Continue"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
