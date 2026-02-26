"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Mic, User, Sliders } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useB2CUser } from "../lib/b2c-user-context"

export function B2CProfile() {
  const { profile, controls, setProfile, setControls, persistProfile, persistControls } = useB2CUser()
  const [voiceRecording, setVoiceRecording] = useState(false)
  const [voiceContext, setVoiceContext] = useState("")

  useEffect(() => {
    try {
      const prefs = sessionStorage.getItem("b2c_preferences")
      if (prefs) {
        const p = JSON.parse(prefs)
        setVoiceContext(p.voiceNoteText ?? p.voiceContext ?? "")
      }
    } catch {}
  }, [])

  const handleVoiceNote = () => {
    if (typeof window === "undefined") return
    const win = window as Window & { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown }
    const Recognition = win.SpeechRecognition ?? win.webkitSpeechRecognition
    if (!Recognition) return
    const rec = new Recognition() as {
      start: () => void
      stop?: () => void
      continuous: boolean
      interimResults: boolean
      lang: string
      onresult: (e: { results: unknown[] }) => void
      onend: () => void
      onerror: () => void
    }
    if (voiceRecording) {
      rec.stop?.()
      setVoiceRecording(false)
      return
    }
    rec.continuous = true
    rec.interimResults = true
    rec.lang = "en-US"
    setVoiceRecording(true)
    rec.onresult = (e) => {
      let text = ""
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i] as { [j: number]: { transcript?: string } }
        text += r?.[0]?.transcript ?? ""
      }
      setVoiceContext((prev) => (prev ? `${prev} ${text}` : text).trim())
    }
    rec.onend = () => setVoiceRecording(false)
    rec.onerror = () => setVoiceRecording(false)
    rec.start()
  }

  const saveVoiceContext = () => {
    if (typeof window !== "undefined") {
      try {
        const prefs = JSON.parse(sessionStorage.getItem("b2c_preferences") || "{}")
        prefs.voiceNoteText = voiceContext
        prefs.voiceContext = voiceContext
        sessionStorage.setItem("b2c_preferences", JSON.stringify(prefs))
      } catch {}
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <header className="shrink-0 border-b border-border bg-card px-6 py-4">
        <h1 className="text-xl font-semibold tracking-tight">Me</h1>
        <p className="text-sm text-muted-foreground">
          Controls and contact details
        </p>
      </header>
      <div className="flex-1 overflow-y-auto p-6">
        <Tabs defaultValue="controls" className="mx-auto max-w-xl">
          <TabsList className="mb-4 grid w-full grid-cols-2">
            <TabsTrigger value="controls" className="gap-2">
              <Sliders className="size-4" />
              Controls
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <User className="size-4" />
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="controls" className="space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <p className="text-sm text-muted-foreground">Budget, filters, location.</p>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild>
                  <Link href="/b2c-snippy/onboarding">Edit preferences</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Voice context</CardTitle>
                <p className="text-sm text-muted-foreground">Describes your ideal place. Affects ranking.</p>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  type="button"
                  variant={voiceRecording ? "destructive" : "outline"}
                  onClick={handleVoiceNote}
                  className="gap-2"
                >
                  <Mic className="size-4" />
                  {voiceRecording ? "Stop" : "Record voice note"}
                </Button>
                <Textarea
                  placeholder="e.g. something with character, quiet but near cafés"
                  value={voiceContext}
                  onChange={(e) => setVoiceContext(e.target.value)}
                  onBlur={saveVoiceContext}
                  className="min-h-[80px]"
                />
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Contact mode</CardTitle>
                <p className="text-sm text-muted-foreground">How should we contact agents?</p>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={controls.communicationMode}
                  onValueChange={(v) => {
                    setControls({ communicationMode: v as "manual" | "bot_assisted" | "full_auto" })
                    persistControls({ ...controls, communicationMode: v as typeof controls.communicationMode })
                  }}
                  className="grid gap-3"
                >
                  <Label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <RadioGroupItem value="manual" className="mt-0.5" />
                    <div>
                      <span className="font-medium">Manual only</span>
                      <p className="text-xs text-muted-foreground">You contact agents yourself.</p>
                    </div>
                  </Label>
                  <Label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <RadioGroupItem value="bot_assisted" className="mt-0.5" />
                    <div>
                      <span className="font-medium">Bot assisted</span>
                      <p className="text-xs text-muted-foreground">Bot drafts; you confirm before sending.</p>
                    </div>
                  </Label>
                  <Label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <RadioGroupItem value="full_auto" className="mt-0.5" />
                    <div>
                      <span className="font-medium">Fully automated</span>
                      <p className="text-xs text-muted-foreground">Bot contacts with your approval.</p>
                    </div>
                  </Label>
                </RadioGroup>
                {(controls.communicationMode === "bot_assisted" || controls.communicationMode === "full_auto") && (
                  <div className="mt-4 flex items-center justify-between rounded-lg border border-border p-4">
                    <Label htmlFor="confirm">Confirm before bot sends</Label>
                    <Switch
                      id="confirm"
                      checked={controls.botConfirmBeforeSend}
                      onCheckedChange={(c) => {
                        setControls({ botConfirmBeforeSend: c })
                        persistControls({ ...controls, botConfirmBeforeSend: c })
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <p className="text-sm text-muted-foreground">Early warnings for new high-match listings.</p>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <Label htmlFor="early">Early warning alerts</Label>
                <Switch
                  id="early"
                  checked={controls.earlyWarnings}
                  onCheckedChange={(c) => {
                    setControls({ earlyWarnings: c })
                    persistControls({ ...controls, earlyWarnings: c })
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Contact details</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Used when the bot contacts agents. WhatsApp is used for messaging.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    value={profile.name}
                    onChange={(e) => setProfile({ name: e.target.value })}
                    onBlur={(e) => persistProfile({ ...profile, name: (e.target as HTMLInputElement).value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={profile.email}
                    onChange={(e) => setProfile({ email: e.target.value })}
                    onBlur={(e) => persistProfile({ ...profile, email: (e.target as HTMLInputElement).value })}
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
                    onBlur={(e) => persistProfile({ ...profile, phone: (e.target as HTMLInputElement).value })}
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
                    onBlur={(e) => persistProfile({ ...profile, whatsapp: (e.target as HTMLInputElement).value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Bot initiates contact via WhatsApp. Include country code.
                  </p>
                </div>
                <Button onClick={() => persistProfile()}>Save contact details</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
