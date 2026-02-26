import { Bot, Globe, Facebook, Layers, FlaskConical, Database, Users, Settings, Building2, Menu, X, Scissors, Home } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

const navItems = [
  { to: "/", label: "Run & Monitor", icon: Bot },
  { to: "/website-bot", label: "Website Scan", icon: Globe },
  { to: "/facebook-bot", label: "Facebook Scan", icon: Facebook },
  { to: "/pipeline", label: "Pipeline", icon: Layers },
  { to: "/test-build", label: "Test & Build", icon: FlaskConical },
  { to: "/data", label: "Data", icon: Database },
  { to: "/crm", label: "CRM", icon: Users },
  { to: "/operator-onboarding", label: "Operators", icon: Settings },
  { to: "/agents-apis", label: "Agents & APIs", icon: Building2 },
  { to: "/b2c", label: "B2C App", icon: Home },
];

export function AppSidebar() {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const sidebar = (
    <aside className={`
      ${isMobile ? "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" : "sticky top-0 h-screen"}
      ${isMobile && !open ? "pointer-events-none opacity-0" : "opacity-100"}
      transition-opacity duration-200
    `}>
      <nav className={`
        ${isMobile ? "absolute left-0 top-0 bottom-0 w-72 bg-sidebar border-r border-sidebar-border shadow-2xl" : "w-60 border-r border-sidebar-border bg-sidebar"}
        h-full flex flex-col
        ${isMobile ? (open ? "translate-x-0" : "-translate-x-full") : ""}
        transition-transform duration-200
      `}>
        {/* Logo */}
        <div className="px-5 py-5 flex items-center justify-between border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
              <Scissors className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-sidebar-foreground">Immo Snippy</h1>
              <p className="text-[10px] text-muted-foreground leading-none">Real estate pipeline</p>
            </div>
          </div>
          {isMobile && (
            <button onClick={() => setOpen(false)} className="p-1 rounded-md hover:bg-sidebar-accent text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Nav */}
        <div className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-lg transition-colors"
                activeClassName="!bg-primary/10 !text-primary font-semibold"
                onClick={() => isMobile && setOpen(false)}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </NavLink>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-sidebar-border">
          <p className="text-[10px] text-muted-foreground">Immo Snippy v1.0</p>
          <p className="text-[10px] text-muted-foreground">Luxembourg Real Estate</p>
        </div>
      </nav>

      {/* Backdrop click to close */}
      {isMobile && open && (
        <div className="absolute inset-0 -z-10" onClick={() => setOpen(false)} />
      )}
    </aside>
  );

  return (
    <>
      {/* Mobile hamburger */}
      {isMobile && (
        <button
          onClick={() => setOpen(true)}
          className="fixed top-3 left-3 z-40 p-2 rounded-lg bg-card border border-border shadow-md hover:bg-secondary transition-colors"
        >
          <Menu className="w-4 h-4" />
        </button>
      )}
      {sidebar}
    </>
  );
}
