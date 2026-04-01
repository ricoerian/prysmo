"use client";

import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Printer, Package, ShoppingCart, Plus } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/printers",  label: "Printers",  icon: Printer },
  null, // FAB placeholder
  { href: "/supplies",  label: "Supplies",  icon: Package },
  { href: "/orders",    label: "Orders",    icon: ShoppingCart },
] as const;

function openForm() {
  window.dispatchEvent(new CustomEvent("prysmo:openForm"));
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="app-shell">
      <main className="page-content">{children}</main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav" aria-label="Main navigation">
        {NAV_ITEMS.map((item, i) => {
          if (item === null) {
            return <div key="fab-placeholder" className="nav-fab-placeholder" />;
          }
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <button
              key={item.href}
              id={`nav-${item.label.toLowerCase()}`}
              className={`nav-item${isActive ? " active" : ""}`}
              onClick={() => router.push(item.href)}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <Icon />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Floating Action Button */}
      <button
        id="main-fab"
        className="fab"
        aria-label="Add new item"
        onClick={openForm}
      >
        <Plus />
      </button>
    </div>
  );
}
