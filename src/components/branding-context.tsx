"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/client-api";
import { DEFAULT_BRANDING, type CardBranding } from "@/lib/branding";

type Ctx = {
  branding: CardBranding;
  setBranding: (b: CardBranding) => void;
  refresh: () => Promise<void>;
};

const BrandingContext = createContext<Ctx | null>(null);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<CardBranding>(DEFAULT_BRANDING);

  const refresh = useCallback(async () => {
    try {
      const res = await apiFetch("/api/settings");
      if (!res.ok) return;
      const data = (await res.json()) as { branding?: CardBranding };
      if (data.branding) setBranding(data.branding);
    } catch {
      /* garder les valeurs par défaut */
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <BrandingContext.Provider value={{ branding, setBranding, refresh }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding(): Ctx {
  const ctx = useContext(BrandingContext);
  const [fallback, setFallback] = useState<CardBranding>(DEFAULT_BRANDING);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/branding");
      const data = (await res.json()) as { branding?: Partial<CardBranding> | null };
      if (data.branding) setFallback({ ...DEFAULT_BRANDING, ...data.branding });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (ctx) return;
    void refresh();
  }, [ctx, refresh]);

  if (ctx) return ctx;
  return { branding: fallback, setBranding: setFallback, refresh };
}
