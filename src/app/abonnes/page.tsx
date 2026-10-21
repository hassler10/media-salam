"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AppShell, PageHeader, StatusBadge } from "@/components/app-shell";
import type { Subscriber } from "@/lib/types";
import { formatDateFR, fullName, genderLabel, getStatus } from "@/lib/utils";
import { apiFetch } from "@/lib/client-api";

const FILTERS = [
  { id: "tous", label: "Tous les abonnés" },
  { id: "valides", label: "Abonnements valides" },
  { id: "expires", label: "Abonnements expirés" },
  { id: "bientot", label: "Arrivant à expiration" },
  { id: "hommes", label: "Hommes" },
  { id: "femmes", label: "Femmes" },
];

function AbonnesInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState(params.get("filter") || "tous");
  const [items, setItems] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState<Subscriber | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (filter && filter !== "tous") sp.set("filter", filter);
    sp.set("photos", "1");
    const res = await apiFetch(`/api/subscribers?${sp.toString()}`);
    const data = await res.json();
    setItems(data.items ?? []);
    setLoading(false);
  }

  useEffect(() => {
    const t = setTimeout(() => void load(), 180);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, filter]);

  const counts = useMemo(() => ({ total: items.length }), [items]);

  async function confirmDelete() {
    if (!toDelete) return;
    const res = await apiFetch(`/api/subscribers/${toDelete.id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Suppression impossible.");
    } else {
      setToDelete(null);
      void load();
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Liste des abonnés"
        subtitle={`${counts.total} fiche${counts.total > 1 ? "s" : ""} affichée${counts.total > 1 ? "s" : ""}.`}
        actions={
          <Link href="/abonnes/nouveau" className="btn btn-primary">
            Enregistrer un abonné
          </Link>
        }
      />
      {error ? <div className="alert error">{error}</div> : null}
      <div className="toolbar">
        <input
          className="search"
          placeholder="Rechercher par nom, prénoms, contact ou numéro…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={filter === f.id ? "chip chip-active" : "chip"}
            onClick={() => {
              setFilter(f.id);
              router.replace(f.id === "tous" ? "/abonnes" : `/abonnes?filter=${f.id}`);
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="panel table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Photo</th>
              <th>Abonné</th>
              <th>N° d&apos;abonnement</th>
              <th>Contact</th>
              <th>Sexe</th>
              <th>Validité</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="empty">
                  Chargement…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty">
                  Aucun abonné ne correspond à cette recherche.
                </td>
              </tr>
            ) : (
              items.map((s) => (
                <tr key={s.id}>
                  <td>
                    {s.photoData && s.photoData !== "[photo]" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="thumb" src={s.photoData} alt="" />
                    ) : (
                      <span className="thumb initials">{s.lastName.slice(0, 1)}</span>
                    )}
                  </td>
                  <td>
                    <strong>{fullName(s.lastName, s.firstName)}</strong>
                    <div className="muted">{s.profession || "—"}</div>
                  </td>
                  <td className="mono">{s.subscriptionNumber}</td>
                  <td>{s.phone}</td>
                  <td>{genderLabel(s.gender)}</td>
                  <td>{formatDateFR(s.validityDate)}</td>
                  <td>
                    <StatusBadge status={getStatus(s.validityDate)} />
                  </td>
                  <td className="row-actions">
                    <Link href={`/abonnes/${s.id}`}>Fiche</Link>
                    <Link href={`/cartes?id=${s.id}`}>Carte</Link>
                    <Link href={`/imprimer/${s.id}`} target="_blank">
                      Imprimer
                    </Link>
                    <button type="button" onClick={() => setToDelete(s)}>
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {toDelete ? (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Confirmer la suppression</h3>
            <p>
              Supprimer définitivement {fullName(toDelete.lastName, toDelete.firstName)} (
              {toDelete.subscriptionNumber}) ? Cette action est irréversible.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setToDelete(null)}>
                Annuler
              </button>
              <button type="button" className="btn btn-danger" onClick={() => void confirmDelete()}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

export default function AbonnesPage() {
  return (
    <Suspense fallback={<AppShell><p className="empty">Chargement…</p></AppShell>}>
      <AbonnesInner />
    </Suspense>
  );
}
