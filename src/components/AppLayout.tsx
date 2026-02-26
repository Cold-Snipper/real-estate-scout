import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";

export function AppLayout() {
  const location = useLocation();
  const isCrm = location.pathname === "/crm";

  return (
    <div className="min-h-screen w-full flex">
      <AppSidebar />
      <main className={`flex-1 min-w-0 ${isCrm ? "flex flex-col overflow-hidden h-screen" : ""}`}>
        {isCrm ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <Outlet />
          </div>
        ) : (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <Outlet />
          </div>
        )}
      </main>
    </div>
  );
}

