import { useLocation, useNavigate } from "react-router-dom";
import { Home, Heart, Bell, User } from "lucide-react";

const tabs = [
  { path: "/b2c/discover", label: "Discover", icon: Home },
  { path: "/b2c/saved", label: "Saved", icon: Heart },
  { path: "/b2c/alerts", label: "Alerts", icon: Bell },
  { path: "/b2c/profile", label: "Me", icon: User },
];

export default function B2CBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border sm:hidden">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className={`w-5 h-5 ${active ? "text-primary" : ""}`} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
