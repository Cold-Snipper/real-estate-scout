"use client"

import { B2CSidebar } from "./B2CSidebar"
import { B2CBottomNav } from "./B2CBottomNav"
import { ListingProvider } from "../lib/listing-context"
import { B2CUserProvider } from "../lib/b2c-user-context"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

export function B2CLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile()

  return (
    <B2CUserProvider>
    <ListingProvider>
      <div className="flex h-screen bg-background overflow-hidden">
        {!isMobile && <B2CSidebar />}
        <main
          className={cn(
            "flex-1 flex flex-col overflow-hidden",
            isMobile && "pb-16"
          )}
        >
          {children}
        </main>
      </div>
      {isMobile && <B2CBottomNav />}
    </ListingProvider>
    </B2CUserProvider>
  )
}
