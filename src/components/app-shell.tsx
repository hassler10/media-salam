"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatedBg } from "@/components/animated-bg";
import { BrandingProvider, useBranding } from "@/components/branding-context";
import { CmpLogo } from "@/components/card-graphics";
import { apiFetch, setClientToken } from "@/lib/client-api";
import { logoSrc } from "@/lib/branding";
import { LIBRARY } from "@/lib/constants";
import type { SessionUser } from "@/lib/types";

const NAV = [
  { href: "/", label: "Tableau de bord", icon: "home", roles: ["superadmin", "administrateur"] },
  { href: "/abonnes/nouveau", label: "Enregistrer un abonné", icon: "plus", roles: ["superadmin", "administrateur"] },
  { href: "/abonnes", label: "Liste des abonnés", icon: "list", roles: ["superadmin", "administrateur"] },
  { href: "/cartes", label: "Générer une carte", icon: "card", roles: ["superadmin", "administrateur"] },
  { href: "/historique", label: "Historique des abonnements", icon: "clock", roles: ["superadmin", "administrateur"] },
  { href: "/parametres", label: "Super admin — Carte", icon: "star", roles: ["superadmin"] },
  { href: "/maintenance", label: "Maintenance numérique", icon: "wrench", roles: ["superadmin", "administrateur"] },
];

function NavIcon({ name }: { name: string }) {
  const common = { width: 18, height: 18, fill: "none", stroke: "currentColor", strokeWidth: 1.8 };
  if (name === "home") {
    return (
      <svg {...common} viewBox="0 0 24 24">
        <path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5z" />
      </svg>
    );
  }
  if (name === "plus") {
    return (
      <svg {...common} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    );
  }
  if (name === "list") {
    return (
      <svg {...common} viewBox="0 0 24 24">
        <path d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01" />
      </svg>
    );
  }
  if (name === "card") {
    return (
      <svg {...common} viewBox="0 0 24 24">
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 10h18" />
      </svg>
    );
  }
  if (name === "clock") {
    return (
      <svg {...common} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }
  if (name === "star") {
    return (
      <svg {...common} viewBox="0 0 24 24">
        <path d="M12 4 14.2 9.2 20 10l-4 3.8.9 5.7L12 16.8 7.1 19.5 8 13.8 4 10l5.8-.8z" />
      </svg>
    );
  }
  return (
    <svg {...common} viewBox="0 0 24 24">
      <path d="M14 7.2 16.8 10 14 12.8M10 16.8 7.2 14 10 11.2" />
      <circle cx="12" cy="12" r="2.2" />
    </svg>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/auth/me")
      .then(async (res) => {
        if (!res.ok) {
          router.replace("/login");
          return;
        }
        const data = (await res.json()) as { user: SessionUser };
        if (!cancelled) {
          setUser(data.user);
          setReady(true);
        }
      })
      .catch(() => router.replace("/login"));
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function logout() {
    setClientToken(null);
    await apiFetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  if (!ready) {
    return (
      <div className="boot-screen">
        <AnimatedBg variant="immersive" />
        <CmpLogo className="boot-logo" />
        <p>Chargement du service de maintenance numérique…</p>
      </div>
    );
  }

  return (
    <BrandingProvider>
      <AppFrame user={user} open={open} setOpen={setOpen} logout={logout}>
        {children}
      </AppFrame>
    </BrandingProvider>
  );
}

function AppFrame({
  children,
  user,
  open,
  setOpen,
  logout,
}: {
  children: ReactNode;
  user: SessionUser | null;
  open: boolean;
  setOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  logout: () => void;
}) {
  const pathname = usePathname();
  const { branding } = useBranding();
  const role = user?.role || "administrateur";
  const items = NAV.filter((item) => item.roles.includes(role));

  return (
    <div className="app-shell">
      <AnimatedBg variant="app" />
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-brand">
          <CmpLogo className="sidebar-logo" alt={branding.shortName} src={logoSrc(branding)} />
          <div>
            <strong>{branding.shortName}</strong>
            <span>{branding.titleLine2 || branding.institutionName}</span>
          </div>
        </div>
        <nav>
          {items.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "nav-link active" : "nav-link"}
                onClick={() => setOpen(false)}
              >
                <NavIcon name={item.icon} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-user">
          <div>
            <strong>{user?.displayName}</strong>
            <span>{user?.role === "superadmin" ? "Super administrateur" : user?.role}</span>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void logout()}>
            Déconnexion
          </button>
        </div>
      </aside>
      <div className="main-col">
        <header className="topbar">
          <button type="button" className="menu-btn" onClick={() => setOpen((v) => !v)} aria-label="Menu">
            ☰
          </button>
          <div className="topbar-title">
            <p className="eyebrow">Service de Maintenance Numérique</p>
            <h1>{branding.institutionName || LIBRARY.name}</h1>
          </div>
          <div className="topbar-meta">
            <span className="gold-dot" />
            Session : {user?.username}
          </div>
        </header>
        <div className="page-body">{children}</div>
      </div>
      {open ? <button className="nav-backdrop" onClick={() => setOpen(false)} aria-label="Fermer le menu" /> : null}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </div>
  );
}

export function StatusBadge({ status }: { status: "valide" | "expire" | "bientot" }) {
  const label = status === "valide" ? "Valide" : status === "expire" ? "Expiré" : "Expire bientôt";
  return <span className={`badge badge-${status}`}>{label}</span>;
}
