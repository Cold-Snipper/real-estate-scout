"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Store, Heart, LayoutList, Bell, User, Sliders, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Discover", icon: LayoutList, href: "/b2c-snippy/discover", exact: true },
  { label: "Saved", icon: Heart, href: "/b2c-snippy/saved", exact: false },
  { label: "Alerts", icon: Bell, href: "/b2c-snippy/alerts", exact: false },
  { label: "Controls", icon: Sliders, href: "/b2c-snippy/controls", exact: true },
  { label: "Profile", icon: User, href: "/b2c-snippy/profile", exact: true },
]

export function B2CSidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-60 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border shrink-0">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center justify-center size-8 rounded-lg bg-primary">
          <Store className="size-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-bold text-sidebar-foreground tracking-tight">
          B2C Snippy
        </span>
      </div>

      <nav className="flex flex-col gap-1 px-3 py-4" aria-label="B2C navigation">
        {navItems.map((item) => {
          const isActive = item.exact !== false
            ? pathname === item.href
            : pathname.startsWith(item.href) && pathname !== "/b2c-snippy"
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto space-y-2 border-t border-sidebar-border px-4 py-4">
        <Link
          href="/available"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        >
          <Building2 className="size-4" />
          Switch to B2B (Agency)
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-8 rounded-full bg-primary text-xs font-bold text-primary-foreground">
            ?
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-sidebar-foreground">B2C User</span>
            <span className="text-[11px] text-sidebar-muted">Rent or buy</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
