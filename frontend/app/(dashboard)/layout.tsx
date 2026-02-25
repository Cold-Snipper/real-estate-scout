"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { ListingProvider } from "@/lib/listing-context"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ListingProvider>
      <div className="flex h-screen bg-background overflow-hidden">
        <AppSidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </ListingProvider>
  )
}
