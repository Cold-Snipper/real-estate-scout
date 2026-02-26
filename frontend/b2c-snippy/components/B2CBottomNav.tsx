"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutList, Heart, Bell, User } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Discover", icon: LayoutList, href: "/b2c-snippy/discover" },
  { label: "Saved", icon: Heart, href: "/b2c-snippy/saved" },
  { label: "Alerts", icon: Bell, href: "/b2c-snippy/alerts" },
  { label: "Me", icon: User, href: "/b2c-snippy/profile" },
]

export function B2CBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border bg-card px-2 py-2 safe-area-pb md:hidden"
      aria-label="B2C navigation"
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/b2c-snippy/discover" && pathname.startsWith(item.href))
        return (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg px-4 py-2 text-xs font-medium transition-colors min-w-[64px]",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className={cn("size-5", isActive && "text-primary")} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
