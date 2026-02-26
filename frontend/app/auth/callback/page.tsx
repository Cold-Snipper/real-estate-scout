"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

// Handles hash-based auth tokens (invite links, magic links using implicit flow).
// The token lives in the URL hash which the server never sees, so middleware
// can't block this page. The Supabase client picks up the hash automatically.
export default function AuthCallbackPage() {
  useEffect(() => {
    const supabase = createClient()
    // getSession() processes any #access_token in the hash and stores the session
    supabase.auth.getSession().then(() => {
      window.location.replace("/")
    })
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Signing you in…</p>
    </div>
  )
}
