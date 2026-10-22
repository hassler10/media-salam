"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatedBg } from "@/components/animated-bg";
import { CmpLogo } from "@/components/card-graphics";
import { apiFetch } from "@/lib/client-api";
import { DEFAULT_BRANDING, logoSrc, type CardBranding } from "@/lib/branding";
import { LIBRARY } from "@/lib/constants";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [branding, setBranding] = useState<CardBranding>(DEFAULT_BRANDING);

  useEffect(() => {
    void fetch("/api/branding")
      .then((r) => r.json())
      .then((d: { branding?: Partial<CardBranding> | null }) => {
        if (d.branding) setBranding({ ...DEFAULT_BRANDING, ...d.branding });
      });
  }, []);

  async function onSubmit(e?: FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Connexion refusée.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Impossible de joindre le serveur.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <AnimatedBg variant="immersive" />
      <div className="login-card">
        <CmpLogo className="login-logo" alt={branding.shortName} src={logoSrc(branding)} />
        <p className="eyebrow">Service de Maintenance Numérique</p>
        <h1>{branding.shortName || LIBRARY.shortName}</h1>
        <p className="login-sub">{branding.institutionName || LIBRARY.name}</p>
        <form onSubmit={(e) => void onSubmit(e)} className="login-form">
          {error ? <div className="alert error">{error}</div> : null}
          <label className="field">
            <span>Identifiant</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="Identifiant administrateur"
            />
          </label>
          <label className="field">
            <span>Mot de passe</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "Connexion…" : "Accéder à l'administration"}
          </button>
        </form>
      </div>
    </main>
  );
}
