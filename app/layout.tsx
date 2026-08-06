import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "@/trpc/client";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Samo Što Nije",
    template: "%s · Samo Što Nije",
  },
  description: "Jednostavno praćenje narudžbi bez čekanja u redu.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="bs"
      data-theme="samosto"
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-base-100 text-base-content">
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
