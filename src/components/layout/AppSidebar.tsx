"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarX2,
  BarChart3,
  Settings,
  LogOut,
  LayoutDashboard,
  ChevronDown,
  GraduationCap,
  Users,
  BookMarked,
  ClipboardList,
  CalendarDays,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Panou principal", icon: LayoutDashboard },
  { href: "/catalog", label: "Catalog", icon: BookOpen },
  { href: "/absente", label: "Absențe", icon: CalendarX2 },
  { href: "/rapoarte", label: "Rapoarte", icon: BarChart3 },
];

const adminSubItems = [
  { href: "/admin/ani-scolari", label: "Ani școlari", icon: CalendarDays },
  { href: "/admin/clase", label: "Clase", icon: GraduationCap },
  { href: "/admin/elevi", label: "Elevi", icon: Users },
  { href: "/admin/materii", label: "Materii", icon: BookMarked },
  { href: "/admin/incadrari", label: "Încadrări", icon: ClipboardList },
];

function NavLink({
  href,
  label,
  icon: Icon,
  isActive,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  isActive: boolean;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        render={
          <Link
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full",
              isActive
                ? "bg-white/15 text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{label}</span>
          </Link>
        }
      />
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const isAdminSection = pathname.startsWith("/admin");
  const [adminOpen, setAdminOpen] = useState(isAdminSection);

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">Catalog Școlar</p>
            <p className="text-xs text-white/60 leading-tight">Digital</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/50 text-xs font-semibold uppercase tracking-wider px-3 mb-1">
            Navigare
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  isActive={pathname === item.href}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-white/50 text-xs font-semibold uppercase tracking-wider px-3 mb-1">
            Sistem
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Admin expandable section */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isAdminSection && !adminSubItems.some((i) => i.href === pathname)}
                  onClick={() => setAdminOpen((v) => !v)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full cursor-pointer",
                    isAdminSection
                      ? "text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Settings className="w-4 h-4 shrink-0" />
                  <span className="flex-1">Administrare</span>
                  <ChevronDown
                    className={cn(
                      "w-3.5 h-3.5 transition-transform",
                      adminOpen && "rotate-180"
                    )}
                  />
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Sub-items */}
              {adminOpen && (
                <div className="ml-3 border-l border-white/10 pl-3 mt-1 space-y-0.5">
                  {adminSubItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          isActive={isActive}
                          render={
                            <Link
                              href={item.href}
                              className={cn(
                                "flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors w-full",
                                isActive
                                  ? "bg-white/15 text-white"
                                  : "text-white/60 hover:bg-white/10 hover:text-white"
                              )}
                            >
                              <Icon className="w-3.5 h-3.5 shrink-0" />
                              <span>{item.label}</span>
                            </Link>
                          }
                        />
                      </SidebarMenuItem>
                    );
                  })}
                </div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-3 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white w-full transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Deconectare</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
