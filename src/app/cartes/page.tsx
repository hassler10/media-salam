"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell, PageHeader } from "@/components/app-shell";
import { CardScaler, MembershipCard } from "@/components/membership-card";
import { PrintSheet } from "@/components/print-sheet";
import { PrintPortal } from "@/components/print-portal";
import { useBranding } from "@/components/branding-context";
import { downloadCardPdf } from "@/components/print-card";
import type { Subscriber } from "@/lib/types";
import { fullName } from "@/lib/utils";
import { apiFetch } from "@/lib/client-api";

function CartesInner() {
  const params = useSearchParams();
  const [items, setItems] = useState<Subscriber[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(
    params.get("id") ? Number(params.get("id")) : null,
  );
  const [q, setQ] = useState("");
  const [showPrint, setShowPrint] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const { branding } = useBranding();

  useEffect(() => {
    void apiFetch("/api/subscribers?photos=1")
      .then((r) => r.json())
      .then((d) => {
        const list = (d.items as Subscriber[]) ?? [];
        setItems(list);
        if (!selectedId && list[0]) setSelectedId(list[0].id);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (s) =>
        s.lastName.toLowerCase().includes(term) ||
        s.firstName.toLowerCase().includes(term) ||
        s.subscriptionNumber.toLowerCase().includes(term) ||
        s.phone.toLowerCase().includes(term),
    );
  }, [items, q]);

  const selected = items.find((s) => s.id === selectedId) ?? null;

  async function mark(action: "generate" | "print" | "download") {
    if (!selected) return;
    await apiFetch(`/api/subscribers/${selected.id}/card`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
  }

  async function download() {
    if (!selected) return;
    const el = cardRef.current?.querySelector(".membership-card") as HTMLElement | null;
    if (!el) return;
    await downloadCardPdf(el, `carte-${selected.subscriptionNumber}.pdf`);
    await mark("download");
    setMessage("PDF généré à l'échelle réelle.");
  }

  return (
    <AppShell>
      <PageHeader
        title="Générer une carte"
        subtitle="Sélectionnez un abonné. Le modèle vert s'applique aux hommes, le modèle gris aux femmes."
      />
      {message ? <div className="alert success">{message}</div> : null}
      <div className="form-layout">
        <div className="panel">
          <input
            className="search"
            placeholder="Rechercher un abonné…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <ul className="select-list">
            {filtered.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className={s.id === selectedId ? "select-item active" : "select-item"}
                  onClick={() => setSelectedId(s.id)}
                >
                  <strong>{fullName(s.lastName, s.firstName)}</strong>
                  <span>
                    {s.subscriptionNumber} · {s.gender === "feminin" ? "Carte grise" : "Carte verte"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel preview-panel" ref={cardRef}>
          {selected ? (
            <>
              <div className="preview-head">
                <h3>{fullName(selected.lastName, selected.firstName)}</h3>
                <span className={`chip ${selected.gender === "feminin" ? "chip-gray" : "chip-green"}`}>
                  {selected.gender === "feminin" ? "Féminin — gris" : "Masculin — vert"}
                </span>
              </div>
              <div className="preview-card">
                <CardScaler scale={1.55}>
                  <MembershipCard data={selected} />
                </CardScaler>
              </div>
              {!branding.publicBaseUrl ? (
                <div className="alert error">
                  Le lien de la bibliothèque numérique n’est pas enregistré : le QR code de la carte
                  restera vide. Saisissez-le dans Super admin — Paramètres.
                </div>
              ) : null}
              <div className="form-buttons">
                <button
                  type="button"
                  className="btn btn-gold"
                  onClick={() => {
                    void mark("generate");
                    setShowPrint(true);
                  }}
                >
                  Générer la carte
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowPrint(true)}>
                  Aperçu A4
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => void download()}>
                  Télécharger PDF
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    void mark("print");
                    setShowPrint(true);
                    setTimeout(() => window.print(), 250);
                  }}
                >
                  Imprimer
                </button>
                <a className="btn btn-ghost" href={`/imprimer/${selected.id}`} target="_blank" rel="noreferrer">
                  Page d&apos;impression
                </a>
              </div>
            </>
          ) : (
            <p className="empty">Choisissez un abonné pour générer sa carte.</p>
          )}
        </div>
      </div>
      {showPrint && selected ? (
        <PrintPortal>
          <div className="print-overlay">
            <div className="print-toolbar no-print">
              <div>
                <strong>Aperçu A4 paysage — taille réelle</strong>
                <p>Une seule carte, recto, centrée, avec repères de coupe.</p>
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => setShowPrint(false)}>
                Fermer
              </button>
            </div>
            <PrintSheet data={selected} />
          </div>
        </PrintPortal>
      ) : null}
    </AppShell>
  );
}

export default function CartesPage() {
  return (
    <Suspense fallback={<AppShell><p className="empty">Chargement…</p></AppShell>}>
      <CartesInner />
    </Suspense>
  );
}
