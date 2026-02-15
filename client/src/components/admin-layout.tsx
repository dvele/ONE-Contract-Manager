import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Building2,
  Home,
  FileText,
  MapPin,
  Warehouse,
  FileCheck,
  Users,
  Settings,
  Variable,
  Blocks,
  ScrollText,
} from "lucide-react";

const adminNavItems = [
  { href: "/admin", label: "General", icon: Settings },
  { href: "/admin/home-models", label: "Home Models", icon: Home },
  { href: "/admin/project-units", label: "Project Units", icon: Warehouse },
  { href: "/admin/llcs", label: "LLCs", icon: Building2 },
  { href: "/clause-library", label: "Clause Library", icon: ScrollText },
  { href: "/component-library", label: "Component Library", icon: Blocks },
  { href: "/exhibits", label: "Exhibits", icon: FileText },
  { href: "/admin/state-disclosures", label: "State Disclosures", icon: MapPin },
  { href: "/admin/contract-templates", label: "Contract Templates", icon: FileCheck },
  { href: "/admin/contractor-entities", label: "Contractors", icon: Users },
  { href: "/admin/variables", label: "Variables", icon: Variable },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();

  return (
    <div className="flex h-full">
      <aside className="w-64 border-r bg-muted/30 p-4 space-y-1">
        <h2 className="text-lg font-semibold mb-4 px-3" data-testid="text-admin-title">
          Admin Settings
        </h2>
        <nav className="space-y-1">
          {adminNavItems.map((item) => {
            const isActive = location === item.href || 
              (item.href !== "/admin" && location.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover-elevate"
                  )}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}
