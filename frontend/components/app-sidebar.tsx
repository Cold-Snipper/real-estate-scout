"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Building2, Sparkles, Search, Users, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Fresh Listings", icon: Sparkles, href: "/" },
  { label: "Available Listings", icon: Search, href: "/available" },
  { label: "CRM", icon: Users, href: "/crm" },
  { label: "Settings", icon: Settings, href: "/settings" },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-60 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border shrink-0">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center justify-center size-8 rounded-lg bg-primary">
          <Building2 className="size-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-bold text-sidebar-foreground tracking-tight">
          Immo Snippy
        </span>
      </div>

      <nav className="flex flex-col gap-1 px-3 py-4" aria-label="Main navigation">
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
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

      <div className="mt-auto border-t border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-8 rounded-full bg-primary text-xs font-bold text-primary-foreground">
            JR
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-sidebar-foreground">Julia Reyes</span>
            <span className="text-[11px] text-sidebar-muted">Acquisition Lead</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
