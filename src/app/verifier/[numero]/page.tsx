"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AnimatedBg } from "@/components/animated-bg";
import { CmpLogo } from "@/components/card-graphics";
import { DEFAULT_BRANDING, logoSrc, type CardBranding } from "@/lib/branding";
import { LIBRARY } from "@/lib/constants";
import { formatDateFR, fullName, statusLabel } from "@/lib/utils";
import type { SubscriberStatus } from "@/lib/types";

type Payload = {
  subscriptionNumber: string;
  lastName: string;
  firstName: string;
  gender: string;
  profession: string | null;
  validityDate: string;
  registrationDate: string;
  photoData: string | null;
  status: SubscriberStatus;
};

export default function VerifierPage() {
  const params = useParams<{ numero: string }>();
  const [state, setState] = useState<"loading" | "missing" | "ok">("loading");
  const [item, setItem] = useState<Payload | null>(null);
  const [branding, setBranding] = useState<CardBranding>(DEFAULT_BRANDING);

  useEffect(() => {
    void fetch("/api/branding")
      .then((r) => r.json())
      .then((d) => {
        if (d.branding) setBranding(d.branding);
      });
    void fetch(`/api/verify/${params.numero}`).then(async (res) => {
      if (!res.ok) {
        setState("missing");
        return;
      }
      const data = await res.json();
      setItem(data.subscriber);
      setState("ok");
    });
  }, [params.numero]);

  return (
    <main className="verify-page">
      <AnimatedBg variant="immersive" />
      <div className="verify-card">
        <CmpLogo className="login-logo" alt={branding.shortName} src={logoSrc(branding)} />
        <p className="eyebrow">Vérification d&apos;abonnement</p>
        <h1>{branding.shortName || LIBRARY.shortName}</h1>
        {state === "loading" ? <p>Contrôle du numéro…</p> : null}
        {state === "missing" ? (
          <div className="alert error">Aucun abonnement ne correspond à ce QR code.</div>
        ) : null}
        {state === "ok" && item ? (
          <div className="verify-body">
            {item.photoData ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.photoData} alt="" className="verify-photo" />
            ) : null}
            <h2>{fullName(item.lastName, item.firstName)}</h2>
            <p className="mono">{item.subscriptionNumber}</p>
            <p>{item.profession || "Profession non renseignée"}</p>
            <p>Valide jusqu&apos;au {formatDateFR(item.validityDate)}</p>
            <span className={`badge badge-${item.status}`}>{statusLabel(item.status)}</span>
            <p className="muted">
              Cette page confirme l&apos;identité de l&apos;abonné et le statut de son abonnement à la
              bibliothèque numérique.
            </p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
