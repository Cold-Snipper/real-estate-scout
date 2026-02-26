"use client"

import Link from "next/link"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function B2CLanding() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-background px-6 py-12">
      <div className="flex max-w-lg flex-col items-center gap-8 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
          <Sparkles className="size-8 text-primary" />
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Find your perfect home in Luxembourg with AI
          </h1>
          <p className="text-muted-foreground">
            Set your preferences once — we rank listings for you and help you contact agents. Start free.
          </p>
        </div>
        <Card className="w-full border-border bg-card shadow-sm">
          <CardContent className="flex flex-col gap-4 pt-6">
            <Button size="lg" className="w-full gap-2" asChild>
              <Link href="/b2c-snippy/onboarding">
                Start free search
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              Already have an account? You’ll set your preferences in the next step.
            </p>
          </CardContent>
        </Card>
        <Link
          href="/b2c-snippy/discover"
          className="text-sm font-medium text-primary hover:underline"
        >
          Skip to Discover →
        </Link>
      </div>
    </div>
  )
}
