import type { Metadata } from "next";

import { isSupabaseConfigured } from "@/lib/supabase/config";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Prijava" };

export default function LoginPage() {
  return <LoginForm configured={isSupabaseConfigured()} />;
}
