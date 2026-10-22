"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { AppShell, PageHeader } from "@/components/app-shell";
import { SubscriberForm } from "@/components/subscriber-form";
import { TrashSubscriberButton } from "@/components/subscriber-trash";
import type { Subscriber } from "@/lib/types";
import { apiFetch } from "@/lib/client-api";

export default function FicheAbonnePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<Subscriber | null>(null);
  const [nextNumber, setNextNumber] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      apiFetch(`/api/subscribers/${params.id}`).then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Introuvable");
        return d.item as Subscriber;
      }),
      apiFetch("/api/subscribers/next-number").then((r) => r.json()),
    ])
      .then(([sub, n]) => {
        setItem(sub);
        setNextNumber(n.number);
      })
      .catch((e: Error) => setError(e.message));
  }, [params.id]);

  return (
    <AppShell>
      <PageHeader
        title={item ? `${item.lastName} ${item.firstName}` : "Fiche abonné"}
        subtitle={item ? `Numéro conservé : ${item.subscriptionNumber}` : "Chargement de la fiche…"}
        actions={
          item ? (
            <TrashSubscriberButton
              subscriber={item}
              className="btn btn-danger"
              afterAction={() => router.replace("/abonnes?filter=supprimes")}
            />
          ) : null
        }
      />
      {error ? <div className="alert error">{error}</div> : null}
      {item ? <SubscriberForm initial={item} nextNumber={nextNumber} /> : null}
    </AppShell>
  );
}
