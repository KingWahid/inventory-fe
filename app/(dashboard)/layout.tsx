import { DashboardShell } from "@/components/dashboard/DashboardShell";
import type { ReactNode } from "react";

export default function DashboardGroupLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
