"use client";

import Link from "next/link";

interface NavbarProps {
  variant?: "landing" | "auth" | "dashboard";
  onLogout?: () => void;
}

export function Navbar({ variant = "landing", onLogout }: NavbarProps) {
  const navLinks =
    variant === "dashboard"
      ? [
          { href: "/dashboard", label: "DISCOVER" },
          { href: "/matches", label: "MATCHES" },
          { href: "/sessions", label: "DEVICES" },
        ]
      : [
          { href: "/login", label: "LOGIN" },
          { href: "/register", label: "REGISTER" },
        ];

  return (
    <header className="relative z-50 w-full border-b border-border bg-olive/50 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center border border-accent bg-accent transition-colors group-hover:bg-transparent">
             <span className="font-display text-xl text-olive transition-colors group-hover:text-accent">D</span>
          </div>
          <span className="font-display text-2xl tracking-tighter text-accent uppercase md:text-3xl">
            devlynix
          </span>
        </Link>

        <nav className="flex items-center gap-6 md:gap-10">
          <div className="flex items-center gap-4 md:gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="nav-link relative font-heading text-[11px] font-bold uppercase tracking-[0.2em] text-text-primary transition-all hover:text-accent"
              >
                {link.label}
              </Link>
            ))}
            {variant === "dashboard" && onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="nav-link relative font-heading text-[11px] font-bold uppercase tracking-[0.2em] text-text-primary transition-all hover:text-accent"
              >
                LOGOUT
              </button>
            )}
          </div>

          <div className="hidden items-center gap-4 border-l border-border pl-6 lg:flex">
             <div className="flex flex-col items-end">
                <span className="font-mono text-[8px] text-text-secondary/60">SYSTEM: ACTIVE</span>
                <span className="font-mono text-[8px] text-text-secondary/60">X-REF: DT-2024</span>
             </div>
             <div className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
          </div>
        </nav>
      </div>

      <div className="flex items-center justify-center gap-4 border-t border-border/30 px-8 py-0.5">
        <div className="h-[0.5px] flex-1 bg-border/40" />
        <div className="flex gap-4">
           {[...Array(5)].map((_, i) => (
             <div key={i} className="h-1 w-1 bg-accent/20 rounded-full" />
           ))}
        </div>
        <div className="h-[0.5px] flex-1 bg-border/40" />
      </div>
    </header>
  );
}
