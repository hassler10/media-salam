"use client";

import { useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { useBranding } from "@/components/branding-context";
import { CardScaler, MembershipCard } from "@/components/membership-card";
import { CmpLogo } from "@/components/card-graphics";
import { apiFetch } from "@/lib/client-api";
import {
  ALIGNMENTS,
  CARD_FONTS,
  CARD_STYLES,
  DEFAULT_BRANDING,
  designDefaults,
  type CardBranding,
} from "@/lib/branding";
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

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="field">
      <span>
        {label} <b className="slider-value">{value}{unit}</b>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

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

  function resetDesign() {
    setForm((prev) => ({ ...prev, ...designDefaults() }));
    setMessage("Design de la carte remis aux réglages d'origine. Clique sur Enregistrer pour l'appliquer.");
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
            <span>Lien de la bibliothèque numérique (QR code)</span>
            <input
              placeholder="https://lien-communique-par-le-developpeur"
              value={form.publicBaseUrl}
              onChange={(e) => update("publicBaseUrl", e.target.value)}
            />
          </label>
          <p className="muted">
            Le QR de la carte ouvre ce lien à l’abonné. Sans adresse enregistrée, le QR reste vide.
          </p>

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

          <h3>Couleurs des deux modèles</h3>
          <p className="muted">Modèle vert = cartes des hommes. Modèle doré = cartes des femmes.</p>
          <div className="grid-2">
            <label className="field">
              <span>Modèle vert — couleur principale</span>
              <input type="color" value={form.malePrimary} onChange={(e) => update("malePrimary", e.target.value)} />
            </label>
            <label className="field">
              <span>Modèle vert — accent (dorure)</span>
              <input type="color" value={form.maleAccent} onChange={(e) => update("maleAccent", e.target.value)} />
            </label>
            <label className="field">
              <span>Modèle doré — couleur principale</span>
              <input type="color" value={form.femalePrimary} onChange={(e) => update("femalePrimary", e.target.value)} />
            </label>
            <label className="field">
              <span>Modèle doré — accent</span>
              <input type="color" value={form.femaleAccent} onChange={(e) => update("femaleAccent", e.target.value)} />
            </label>
          </div>

          <h3>Police et style de la carte</h3>
          <div className="grid-2">
            <label className="field">
              <span>Style</span>
              <select value={form.cardStyle} onChange={(e) => update("cardStyle", e.target.value)}>
                {CARD_STYLES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Police d&apos;écriture</span>
              <select value={form.fontFamily} onChange={(e) => update("fontFamily", e.target.value)}>
                {CARD_FONTS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Alignement des titres</span>
              <select value={form.titleAlign} onChange={(e) => update("titleAlign", e.target.value)}>
                {ALIGNMENTS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Alignement des informations</span>
              <select value={form.fieldsAlign} onChange={(e) => update("fieldsAlign", e.target.value)}>
                {ALIGNMENTS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
            <Slider
              label="Coins arrondis"
              value={form.cornerRadius}
              min={0}
              max={5}
              step={0.2}
              unit=" mm"
              onChange={(v) => update("cornerRadius", v)}
            />
            <Slider
              label="Intensité du motif de fond"
              value={form.patternOpacity}
              min={0}
              max={1}
              step={0.05}
              unit=""
              onChange={(v) => update("patternOpacity", v)}
            />
          </div>
          <label className="field">
            <span>Couleur de fond de la carte</span>
            <input
              type="color"
              value={form.cardBackground}
              onChange={(e) => update("cardBackground", e.target.value)}
            />
          </label>

          <h3>Taille des écritures</h3>
          <p className="muted">1 = taille d&apos;origine. L&apos;aperçu de droite suit vos réglages en direct.</p>
          <div className="grid-2">
            <Slider
              label="Titres de l'en-tête"
              value={form.titleScale}
              min={0.7}
              max={1.6}
              step={0.05}
              unit="×"
              onChange={(v) => update("titleScale", v)}
            />
            <Slider
              label="Nom, prénoms, contact…"
              value={form.fieldScale}
              min={0.7}
              max={1.6}
              step={0.05}
              unit="×"
              onChange={(v) => update("fieldScale", v)}
            />
            <Slider
              label="Bandeau ABONNEMENT"
              value={form.bannerScale}
              min={0.7}
              max={1.6}
              step={0.05}
              unit="×"
              onChange={(v) => update("bannerScale", v)}
            />
            <Slider
              label="Légendes et mention du bas"
              value={form.hintScale}
              min={0.7}
              max={1.8}
              step={0.05}
              unit="×"
              onChange={(v) => update("hintScale", v)}
            />
          </div>
          <Slider
            label="Taille du QR code"
            value={form.qrScale}
            min={0.7}
            max={1.4}
            step={0.05}
            unit="×"
            onChange={(v) => update("qrScale", v)}
          />

          <h3>Position des éléments</h3>
          <p className="muted">Décalez chaque bloc de quelques millimètres, en positif ou en négatif.</p>
          <div className="grid-2">
            <Slider
              label="En-tête (logo et titres)"
              value={form.headerOffsetY}
              min={-4}
              max={6}
              step={0.2}
              unit=" mm"
              onChange={(v) => update("headerOffsetY", v)}
            />
            <Slider
              label="Informations — hauteur"
              value={form.fieldsOffsetY}
              min={-6}
              max={8}
              step={0.2}
              unit=" mm"
              onChange={(v) => update("fieldsOffsetY", v)}
            />
            <Slider
              label="Informations — horizontalement"
              value={form.fieldsOffsetX}
              min={-8}
              max={8}
              step={0.2}
              unit=" mm"
              onChange={(v) => update("fieldsOffsetX", v)}
            />
            <Slider
              label="Photo"
              value={form.photoOffsetY}
              min={-6}
              max={8}
              step={0.2}
              unit=" mm"
              onChange={(v) => update("photoOffsetY", v)}
            />
            <Slider
              label="QR code"
              value={form.qrOffsetY}
              min={-6}
              max={8}
              step={0.2}
              unit=" mm"
              onChange={(v) => update("qrOffsetY", v)}
            />
          </div>
          <button type="button" className="btn btn-ghost" onClick={resetDesign}>
            Revenir au design d&apos;origine
          </button>

          <h3>Affichage</h3>
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
                  Modèle vert (homme)
                </button>
                <button
                  type="button"
                  className={previewGender === "feminin" ? "chip chip-gold" : "chip"}
                  onClick={() => setPreviewGender("feminin")}
                >
                  Modèle doré (femme)
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
