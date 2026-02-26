"use client"

import { B2CLayout } from "@/b2c-snippy/components/B2CLayout"

/**
 * B2C routes live outside the admin (dashboard) layout.
 * No admin sidebar — only B2C sidebar + content.
 */
export default function B2CSnippyLayout({ children }: { children: React.ReactNode }) {
  return <B2CLayout>{children}</B2CLayout>
}
