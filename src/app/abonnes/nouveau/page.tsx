"use client";

import { useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { SubscriberForm } from "@/components/subscriber-form";
import { apiFetch } from "@/lib/client-api";

export default function NouvelAbonnePage() {
  const [nextNumber, setNextNumber] = useState("BSN-2026-000001");

  useEffect(() => {
    void apiFetch("/api/subscribers/next-number")
      .then((r) => r.json())
      .then((d) => {
        if (d.number) setNextNumber(d.number);
      });
  }, []);

  return (
    <AppShell>
      <PageHeader
        title="Enregistrer un abonné"
        subtitle="Le numéro d'abonnement est attribué automatiquement. Le modèle de carte suit le sexe."
      />
      <SubscriberForm nextNumber={nextNumber} />
    </AppShell>
  );
}
