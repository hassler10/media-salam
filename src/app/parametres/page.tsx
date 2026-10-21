"use client";

import { useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { useBranding } from "@/components/branding-context";
import { CardScaler, MembershipCard } from "@/components/membership-card";
import { CmpLogo } from "@/components/card-graphics";
import { apiFetch } from "@/lib/client-api";
import { DEFAULT_BRANDING, type CardBranding } from "@/lib/branding";
import { addYearsISO, todayISO } from "@/lib/utils";

const SAMPLE = {
  lastName: "KONÉ",
  firstName: "Amadou",
  profession: "Enseignant",
  phone: "+225 07 00 00 00 00",
  subscriptionNumber: "BSN-2026-000001",
  validityDate: addYearsISO(todayISO(), 1),
  gender: "masculin" as const,
  photoData: null as string | null,
};

export default function ParametresPage() {
  return (
    <AppShell>
      <ParametresInner />
    </AppShell>
  );
}

function ParametresInner() {
  const { branding, setBranding, refresh } = useBranding();
  const [form, setForm] = useState<CardBranding>(branding);
  const [previewGender, setPreviewGender] = useState<"masculin" | "feminin">("masculin");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    setForm(branding);
  }, [branding]);

  function update<K extends keyof CardBranding>(key: K, value: CardBranding[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onLogo(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      setError("Logo : formats JPG, PNG ou WebP uniquement.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxW = 720;
        const scale = Math.min(1, maxW / img.width);
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        update("logoData", canvas.toDataURL("image/png"));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await apiFetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.status === 403) {
        setForbidden(true);
        setError(data.error);
        return;
      }
      if (!res.ok) {
        setError(data.error || "Enregistrement impossible.");
        return;
      }
      setBranding(data.branding ?? form);
      await refresh();
      setMessage("Paramètres enregistrés. Toutes les cartes utilisent maintenant ces réglages.");
    } catch {
      setError("Erreur réseau.");
    } finally {
      setSaving(false);
    }
  }

  if (forbidden) {
    return (
      <>
        <PageHeader title="Super administrateur" subtitle="Accès restreint." />
        <div className="alert error">Seul le super administrateur peut modifier la carte et le logo.</div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Super admin — Personnalisation de la carte"
        subtitle="Logo, textes et ajouts. Chaque enregistrement s'applique immédiatement à toutes les cartes."
        actions={
          <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void save()}>
            {saving ? "Enregistrement…" : "Enregistrer et appliquer"}
          </button>
        }
      />
      {message ? <div className="alert success">{message}</div> : null}
      {error ? <div className="alert error">{error}</div> : null}

      <div className="form-layout">
        <div className="panel form-panel">
          <h3>Logo de la carte</h3>
          <div className="logo-edit">
            <CmpLogo src={form.logoData} alt="Logo actuel" className="logo-edit-preview" />
            <div>
              <label className="btn btn-ghost">
                Remplacer le logo
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  hidden
                  onChange={(e) => onLogo(e.target.files?.[0])}
                />
              </label>
              <button type="button" className="btn btn-ghost" onClick={() => update("logoData", "")}>
                Revenir au logo CMP par défaut
              </button>
              <p className="muted">PNG ou JPG, fond clair de préférence. Le logo apparaît en haut à gauche de chaque carte.</p>
            </div>
          </div>

          <h3>Textes de l&apos;en-tête</h3>
          <label className="field">
            <span>Nom de l&apos;institution</span>
            <input value={form.institutionName} onChange={(e) => update("institutionName", e.target.value)} />
          </label>
          <label className="field">
            <span>Nom court</span>
            <input value={form.shortName} onChange={(e) => update("shortName", e.target.value)} />
          </label>
          <div className="grid-3">
            <label className="field">
              <span>Titre ligne 1</span>
              <input value={form.titleLine1} onChange={(e) => update("titleLine1", e.target.value)} />
            </label>
            <label className="field">
              <span>Titre ligne 2</span>
              <input value={form.titleLine2} onChange={(e) => update("titleLine2", e.target.value)} />
            </label>
            <label className="field">
              <span>Titre ligne 3</span>
              <input value={form.titleLine3} onChange={(e) => update("titleLine3", e.target.value)} />
            </label>
          </div>
          <label className="field">
            <span>Devise / tagline</span>
            <input value={form.tagline} onChange={(e) => update("tagline", e.target.value)} />
          </label>
          <label className="field">
            <span>Ajout souhaité sous le titre (ligne libre)</span>
            <input
              placeholder="Ex. Complexe Mosquée du Plateau — CMP"
              value={form.extraLine}
              onChange={(e) => update("extraLine", e.target.value)}
            />
          </label>

          <h3>Bandeau droit de la carte</h3>
          <div className="grid-3">
            <label className="field">
              <span>Ligne 1</span>
              <input value={form.bannerLine1} onChange={(e) => update("bannerLine1", e.target.value)} />
            </label>
            <label className="field">
              <span>Ligne 2</span>
              <input value={form.bannerLine2} onChange={(e) => update("bannerLine2", e.target.value)} />
            </label>
            <label className="field">
              <span>Ligne 3</span>
              <input value={form.bannerLine3} onChange={(e) => update("bannerLine3", e.target.value)} />
            </label>
          </div>

          <h3>Pied de carte et QR</h3>
          <label className="field">
            <span>Mention du bas</span>
            <input value={form.motto} onChange={(e) => update("motto", e.target.value)} />
          </label>
          <label className="field">
            <span>Légende photo</span>
            <input value={form.photoCaption} onChange={(e) => update("photoCaption", e.target.value)} />
          </label>
          <label className="field">
            <span>Texte sous le QR code</span>
            <input value={form.qrHint} onChange={(e) => update("qrHint", e.target.value)} />
          </label>
          <label className="field">
            <span>URL publique (QR code)</span>
            <input
              placeholder="https://bibliotheque.mosquee-salam.ci"
              value={form.publicBaseUrl}
              onChange={(e) => update("publicBaseUrl", e.target.value)}
            />
          </label>

          <h3>Champ supplémentaire sur la carte</h3>
          <p className="muted">Laissez vide pour ne rien ajouter. Sinon le champ apparaît entre le contact et le numéro.</p>
          <div className="grid-2">
            <label className="field">
              <span>Libellé</span>
              <input
                placeholder="Ex. Site"
                value={form.extraFieldLabel}
                onChange={(e) => update("extraFieldLabel", e.target.value)}
              />
            </label>
            <label className="field">
              <span>Valeur</span>
              <input
                placeholder="Ex. Plateau — Abidjan"
                value={form.extraFieldValue}
                onChange={(e) => update("extraFieldValue", e.target.value)}
              />
            </label>
          </div>

          <h3>Couleurs</h3>
          <div className="grid-2">
            <label className="field">
              <span>Vert hommes — couleur principale</span>
              <input type="color" value={form.malePrimary} onChange={(e) => update("malePrimary", e.target.value)} />
            </label>
            <label className="field">
              <span>Vert hommes — accent</span>
              <input type="color" value={form.maleAccent} onChange={(e) => update("maleAccent", e.target.value)} />
            </label>
            <label className="field">
              <span>Gris femmes — couleur principale</span>
              <input type="color" value={form.femalePrimary} onChange={(e) => update("femalePrimary", e.target.value)} />
            </label>
            <label className="field">
              <span>Gris femmes — accent</span>
              <input type="color" value={form.femaleAccent} onChange={(e) => update("femaleAccent", e.target.value)} />
            </label>
          </div>

          <label className="check">
            <input
              type="checkbox"
              checked={form.showFooterMotto}
              onChange={(e) => update("showFooterMotto", e.target.checked)}
            />
            Afficher la mention du bas
          </label>
          <label className="check">
            <input type="checkbox" checked={form.showMosque} onChange={(e) => update("showMosque", e.target.checked)} />
            Afficher la silhouette de mosquée
          </label>

          <div className="form-buttons">
            <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void save()}>
              Enregistrer et appliquer à toutes les cartes
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setForm(DEFAULT_BRANDING);
              }}
            >
              Réinitialiser le formulaire
            </button>
          </div>
        </div>

        <aside className="preview-col">
          <div className="panel preview-panel">
            <div className="preview-head">
              <h3>Aperçu en direct</h3>
              <div className="gender-pills">
                <button
                  type="button"
                  className={previewGender === "masculin" ? "chip chip-green" : "chip"}
                  onClick={() => setPreviewGender("masculin")}
                >
                  Homme
                </button>
                <button
                  type="button"
                  className={previewGender === "feminin" ? "chip chip-gray" : "chip"}
                  onClick={() => setPreviewGender("feminin")}
                >
                  Femme
                </button>
              </div>
            </div>
            <div className="preview-card">
              <CardScaler scale={1.45}>
                <MembershipCard data={{ ...SAMPLE, gender: previewGender }} branding={form} />
              </CardScaler>
            </div>
            <p className="hint">
              Modifiez à gauche : le rendu change tout de suite. Cliquez sur Enregistrer pour l&apos;appliquer à
              l&apos;impression et aux fiches abonnés.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
