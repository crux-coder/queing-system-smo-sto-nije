import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getStaffSnapshot } from "@/lib/data/staff";
import { demoStaffSnapshot } from "@/lib/demo";
import { isSupabaseConfigured } from "@/lib/supabase/config";

import { DashboardClient } from "./dashboard-client";

export const metadata: Metadata = { title: "Narudžbe" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const demo = !isSupabaseConfigured();
  const snapshot = demo ? demoStaffSnapshot : await getStaffSnapshot();
  if (!snapshot) redirect("/login");

  return <DashboardClient initialSnapshot={snapshot} demo={demo} />;
}
