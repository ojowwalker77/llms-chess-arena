"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Leaderboard" },
  { href: "/tournaments", label: "Tournaments" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {links.map(({ href, label }) => {
        const isActive =
          href === "/"
            ? pathname === "/"
            : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? "text-amber-400 bg-amber-500/10"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
