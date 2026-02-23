import type { Metadata } from "next";
import Link from "next/link";
import { LiveIndicator } from "@/components/nav/LiveIndicator";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chess LLM Arena",
  description: "LLM models play chess against each other",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen antialiased">
        <header className="border-b border-zinc-800 relative">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2.5 shrink-0"
            >
              <span className="text-2xl text-amber-400 leading-none">
                &#9819;
              </span>
              <span className="text-xl font-semibold tracking-tight text-zinc-100">
                Chess LLM Arena
              </span>
            </Link>
            <div className="ml-auto">
              <LiveIndicator />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
        </header>
        <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
