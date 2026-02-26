"use client"

import Link from "next/link"
import { User, ChevronRight, Lightbulb, Calendar, Briefcase, Globe } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useB2CUser } from "../lib/b2c-user-context"

export function B2CProfileData() {
  const { profile, setProfile, persistProfile } = useB2CUser()

  const handleBlur = (field: keyof typeof profile) => (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value
    persistProfile({ ...profile, [field]: value })
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <header className="shrink-0 border-b border-primary/20 bg-card px-6 py-4">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Your contact details for agents, viewings, and contracts
        </p>
      </header>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-xl space-y-6">
          <div className="flex gap-3 rounded-lg border border-primary/30 bg-primary/10 p-4">
            <Lightbulb className="size-5 shrink-0 text-primary mt-0.5" />
            <div className="space-y-1 text-sm">
              <p className="font-medium text-foreground">Why we need this</p>
              <p className="text-muted-foreground">
                When our bot contacts agents or when you book viewings, agents need your name and how to reach you. Preferred move date helps us prioritise listings. All fields sync to your account.
              </p>
            </div>
          </div>

          <Card className="border-border border-l-4 border-l-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15">
                  <User className="size-4 text-primary" />
                </span>
                Contact details
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Used when the bot contacts agents and when you book viewings. WhatsApp is our primary channel for messaging.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Marie Dupont"
                  value={profile.name}
                  onChange={(e) => setProfile({ name: e.target.value })}
                  onBlur={handleBlur("name")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="marie@example.com"
                  value={profile.email}
                  onChange={(e) => setProfile({ email: e.target.value })}
                  onBlur={handleBlur("email")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+352 123 456 789"
                  value={profile.phone}
                  onChange={(e) => setProfile({ phone: e.target.value })}
                  onBlur={handleBlur("phone")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp number</Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  placeholder="+352 123 456 789"
                  value={profile.whatsapp}
                  onChange={(e) => setProfile({ whatsapp: e.target.value })}
                  onBlur={handleBlur("whatsapp")}
                />
                <p className="text-xs text-muted-foreground">
                  Include country code (e.g. +352 for Luxembourg). The bot uses WhatsApp to message agents.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border border-l-4 border-l-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15">
                  <Calendar className="size-4 text-primary" />
                </span>
                Move-in preferences
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                When do you need to move? Helps us prioritise listings with matching availability.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="preferredMoveDate">Preferred move date</Label>
                <Input
                  id="preferredMoveDate"
                  type="date"
                  value={profile.preferredMoveDate ?? ""}
                  onChange={(e) => setProfile({ preferredMoveDate: e.target.value })}
                  onBlur={handleBlur("preferredMoveDate")}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border border-l-4 border-l-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15">
                  <Briefcase className="size-4 text-primary" />
                </span>
                Employment (optional)
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Some agents ask for employer or income proof. Optional but can speed up applications.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="employer">Employer / company</Label>
                <Input
                  id="employer"
                  placeholder="e.g. Amazon Luxembourg"
                  value={profile.employer ?? ""}
                  onChange={(e) => setProfile({ employer: e.target.value })}
                  onBlur={handleBlur("employer")}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border border-l-4 border-l-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15">
                  <Globe className="size-4 text-primary" />
                </span>
                Additional info (optional)
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Nationality is sometimes required for rental applications. Notes are for your own reference.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nationality">Nationality</Label>
                <Input
                  id="nationality"
                  placeholder="e.g. Luxembourg"
                  value={profile.nationality ?? ""}
                  onChange={(e) => setProfile({ nationality: e.target.value })}
                  onBlur={handleBlur("nationality")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any notes for your applications…"
                  value={profile.notes ?? ""}
                  onChange={(e) => setProfile({ notes: e.target.value })}
                  onBlur={handleBlur("notes")}
                  className="min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col items-center gap-4 pt-4">
            <Button onClick={() => persistProfile()}>Save all</Button>
            <Button variant="outline" asChild className="border-primary/30 hover:bg-primary/5">
              <Link href="/b2c-snippy/controls">
                Go to Controls (preferences & bot)
                <ChevronRight className="size-4 ml-1" />
              </Link>
            </Button>
            <Link href="/available" className="text-xs text-primary/80 hover:text-primary">
              Agency? Switch to B2B →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
