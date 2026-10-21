"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BrandingProvider } from "@/components/branding-context";
import { PrintSheet } from "@/components/print-sheet";
import type { Subscriber } from "@/lib/types";
import { apiFetch } from "@/lib/client-api";

export default function ImprimerPage() {
  const params = useParams<{ id: string }>();
  const [item, setItem] = useState<Subscriber | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiFetch(`/api/subscribers/${params.id}`).then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Carte introuvable.");
        return;
      }
      setItem(data.item);
    });
  }, [params.id]);

  if (error) {
    return (
      <main className="print-error">
        <p>{error}</p>
      </main>
    );
  }
  if (!item) {
    return (
      <main className="print-error">
        <p>Préparation de l&apos;impression…</p>
      </main>
    );
  }

  return (
    <BrandingProvider>
    <main className="print-only-page print-root">
      <div className="print-toolbar no-print">
        <div>
          <strong>Impression — {item.subscriptionNumber}</strong>
          <p>
            Papier A4 paysage, couleur, échelle 100&nbsp;%. Une seule carte au recto, taille réelle
            85,60 × 53,98 mm.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          Imprimer
        </button>
      </div>
      <PrintSheet data={item} />
    </main>
    </BrandingProvider>
  );
}
