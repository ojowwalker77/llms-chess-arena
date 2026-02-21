import type { Metadata } from "next";
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
        <header className="border-b border-zinc-800 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center gap-6">
            <a href="/" className="text-xl font-bold tracking-tight">
              Chess LLM Arena
            </a>
            <nav className="flex gap-4 text-sm text-zinc-400">
              <a href="/" className="hover:text-zinc-100 transition-colors">
                Leaderboard
              </a>
              <a
                href="/tournaments"
                className="hover:text-zinc-100 transition-colors"
              >
                Tournaments
              </a>
            </nav>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
