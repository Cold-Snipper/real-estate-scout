"use client"

import { useState } from "react"
import Link from "next/link"
import { Building2, Eye, EyeOff, Clock, CheckCircle2, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [email, setEmail] = useState("")

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    setEmail(formData.get("email") as string)
    setTimeout(() => {
      setLoading(false)
      setSubmitted(true)
    }, 1000)
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center size-10 rounded-xl bg-primary">
                <Building2 className="size-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold tracking-tight text-foreground">
                Immo Snippy
              </span>
            </div>

            {/* Pending card */}
            <Card className="w-full">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="flex items-center justify-center size-14 rounded-full bg-primary/10">
                    <Clock className="size-7 text-primary" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <h2 className="text-lg font-semibold text-foreground">Account pending approval</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Your request has been submitted. An organization administrator will review and approve your account.
                    </p>
                  </div>

                  <div className="w-full rounded-lg bg-secondary/70 p-4 mt-1">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="size-4 text-score-green mt-0.5 shrink-0" />
                        <p className="text-sm text-foreground text-left">Account created successfully</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <Mail className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                        <p className="text-sm text-muted-foreground text-left">
                          Confirmation sent to <span className="font-medium text-foreground">{email}</span>
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <Clock className="size-4 text-primary mt-0.5 shrink-0" />
                        <p className="text-sm text-muted-foreground text-left">Awaiting admin approval</p>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-1">
                    {"You'll receive an email once your account is approved."}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Link
              href="/login"
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center size-10 rounded-xl bg-primary">
              <Building2 className="size-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              Immo Snippy
            </span>
          </div>

          {/* Card */}
          <Card className="w-full">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Create your account</CardTitle>
              <CardDescription>Get started with your acquisition dashboard</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="org">Organization name</Label>
                  <Input
                    id="org"
                    name="org"
                    type="text"
                    placeholder="Acme Acquisitions"
                    required
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      placeholder="Julia"
                      required
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      placeholder="Reyes"
                      required
                      autoComplete="family-name"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@company.com"
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      required
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Must be at least 8 characters with one uppercase and one number
                  </p>
                </div>

                <Button type="submit" className="w-full mt-2" disabled={loading}>
                  {loading ? "Creating account..." : "Create account"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Login link */}
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
