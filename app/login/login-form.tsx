"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { copy } from "@/lib/copy";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    if (!configured) return;
    setPending(true);
    setError("");
    const supabase = createBrowserSupabaseClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: String(formData.get("email")),
      password: String(formData.get("password")),
    });

    if (signInError) {
      setError("E-mail ili lozinka nisu ispravni.");
      setPending(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-base-200 px-5 py-10">
      <section className="card w-full max-w-md border border-base-300 bg-base-100 shadow-sm">
        <div className="card-body gap-6 p-7 sm:p-9">
          <div>
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-2xl font-black text-primary-content">S</div>
            <h1 className="text-3xl font-bold tracking-tight">{copy.brand}</h1>
            <p className="mt-2 text-base text-base-content/60">Prijavite se za upravljanje redom narudžbi.</p>
          </div>

          <form action={submit} className="space-y-4">
            <label className="fieldset">
              <span className="fieldset-legend text-sm font-semibold">E-mail</span>
              <input name="email" type="email" autoComplete="email" required className="input input-lg w-full" placeholder="lokacija@primjer.ba" disabled={!configured || pending} />
            </label>
            <label className="fieldset">
              <span className="fieldset-legend text-sm font-semibold">Lozinka</span>
              <input name="password" type="password" autoComplete="current-password" required className="input input-lg w-full" disabled={!configured || pending} />
            </label>
            {error ? <div role="alert" className="alert alert-error text-sm">{error}</div> : null}
            <button className="btn btn-primary btn-lg w-full" disabled={!configured || pending}>
              {pending ? <span className="loading loading-spinner" /> : null}
              Prijavi se
            </button>
          </form>

          {!configured ? (
            <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm leading-6">
              Supabase još nije konfigurisan. Možete otvoriti lokalni pregled interfejsa.
              <Link href="/dashboard" className="btn btn-outline mt-3 w-full">Otvori lokalni pregled</Link>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
