"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell, PageHeader, StatusBadge } from "@/components/app-shell";
import type { AppStats, Subscriber } from "@/lib/types";
import { formatDateFR, fullName, getStatus } from "@/lib/utils";
import { apiFetch } from "@/lib/client-api";

export default function DashboardPage() {
  const [stats, setStats] = useState<AppStats | null>(null);
  const [recent, setRecent] = useState<Subscriber[]>([]);
  const [soon, setSoon] = useState<Subscriber[]>([]);

  useEffect(() => {
    void Promise.all([
      apiFetch("/api/stats").then((r) => r.json()),
      apiFetch("/api/subscribers?photos=1").then((r) => r.json()),
      apiFetch("/api/subscribers?filter=bientot&photos=1").then((r) => r.json()),
    ]).then(([s, all, exp]) => {
      setStats(s.stats);
      setRecent((all.items as Subscriber[]).slice(0, 6));
      setSoon((exp.items as Subscriber[]).slice(0, 6));
    });
  }, []);

  return (
    <AppShell>
      <PageHeader
        title="Tableau de bord"
        subtitle="Pilotage des abonnements de la bibliothèque numérique."
        actions={
          <Link href="/abonnes/nouveau" className="btn btn-primary">
            Nouvel abonné
          </Link>
        }
      />

      <section className="stat-grid">
        <StatCard label="Abonnés" value={stats?.total} tone="green" />
        <StatCard label="Abonnements valides" value={stats?.valid} tone="gold" />
        <StatCard label="Expirés" value={stats?.expired} tone="red" />
        <StatCard label="Expirent bientôt" value={stats?.expiringSoon} tone="orange" />
        <StatCard label="Hommes" value={stats?.men} />
        <StatCard label="Femmes" value={stats?.women} />
      </section>

      <section className="dash-grid">
        <div className="panel">
          <div className="panel-head">
            <h3>Derniers abonnés</h3>
            <Link href="/abonnes">Voir la liste</Link>
          </div>
          <ul className="people-list">
            {recent.map((s) => (
              <li key={s.id}>
                <Thumb src={s.photoData} name={s.lastName} />
                <div>
                  <strong>{fullName(s.lastName, s.firstName)}</strong>
                  <span>{s.subscriptionNumber}</span>
                </div>
                <StatusBadge status={getStatus(s.validityDate)} />
              </li>
            ))}
            {recent.length === 0 ? <li className="empty">Aucun abonné pour le moment.</li> : null}
          </ul>
        </div>
        <div className="panel">
          <div className="panel-head">
            <h3>À renouveler</h3>
            <Link href="/abonnes?filter=bientot">Filtres</Link>
          </div>
          <ul className="people-list">
            {soon.map((s) => (
              <li key={s.id}>
                <Thumb src={s.photoData} name={s.lastName} />
                <div>
                  <strong>{fullName(s.lastName, s.firstName)}</strong>
                  <span>Valide jusqu&apos;au {formatDateFR(s.validityDate)}</span>
                </div>
                <Link href={`/cartes?id=${s.id}`} className="btn btn-ghost btn-sm">
                  Carte
                </Link>
              </li>
            ))}
            {soon.length === 0 ? <li className="empty">Aucun abonnement proche de l&apos;échéance.</li> : null}
          </ul>
        </div>
      </section>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value?: number;
  tone?: string;
}) {
  return (
    <article className={`stat-card ${tone ? `tone-${tone}` : ""}`}>
      <span>{label}</span>
      <strong>{value ?? "—"}</strong>
    </article>
  );
}

function Thumb({ src, name }: { src: string | null; name: string }) {
  if (src && src !== "[photo]") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img className="thumb" src={src} alt={name} />
    );
  }
  return <span className="thumb initials">{name.slice(0, 1)}</span>;
}
