"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Building2, Eye, EyeOff, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string

    // Mock auth: demo@immosnippy.com is the approved demo account
    setTimeout(() => {
      if (email === "demo@immosnippy.com") {
        router.push("/")
      } else {
        setLoading(false)
        setError("Your account is pending approval. An administrator will review your request shortly.")
      }
    }, 800)
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
              <CardTitle className="text-xl">Welcome back</CardTitle>
              <CardDescription>Sign in to your account to continue</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {error && (
                  <div className="flex items-start gap-3 rounded-lg border border-score-orange/30 bg-score-orange/8 px-3.5 py-3">
                    <AlertCircle className="size-4 text-score-orange mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground leading-relaxed">{error}</p>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@company.com"
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
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
                </div>

                <Button type="submit" className="w-full mt-2" disabled={loading}>
                  {loading ? "Signing in..." : "Sign in"}
                </Button>

                <p className="text-center text-[11px] text-muted-foreground mt-1">
                  Demo: use <span className="font-medium text-foreground">demo@immosnippy.com</span> to sign in
                </p>
              </form>
            </CardContent>
          </Card>

          {/* Sign up link */}
          <p className="text-sm text-muted-foreground">
            {"Don't have an account? "}
            <Link
              href="/signup"
              className="font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
