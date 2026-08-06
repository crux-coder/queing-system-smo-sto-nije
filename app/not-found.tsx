import Link from "next/link";

import { copy } from "@/lib/copy";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-base-200 px-5 py-10">
      <section className="card w-full max-w-md border border-base-300 bg-base-100 text-center shadow-sm">
        <div className="card-body items-center gap-4 p-9">
          <p className="text-sm font-bold text-primary">{copy.brand}</p>
          <h1 className="text-3xl font-black tracking-tight">Narudžba nije pronađena</h1>
          <p className="text-base-content/60">Provjerite jeste li otvorili cijeli link iz QR koda.</p>
          <Link href="/" className="btn btn-primary mt-2">Nazad na početak</Link>
        </div>
      </section>
    </main>
  );
}
