"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CardScaler, MembershipCard, type CardData } from "@/components/membership-card";
import { PhotoCapture } from "@/components/photo-capture";
import { PrintSheet } from "@/components/print-sheet";
import { PrintPortal } from "@/components/print-portal";
import { downloadCardPdf } from "@/components/print-card";
import { useBranding } from "@/components/branding-context";
import { cardSizeLabel, cardSizeMm } from "@/lib/branding";
import { apiFetch } from "@/lib/client-api";
import { addYearsISO, todayISO } from "@/lib/utils";
import type { Gender, Subscriber } from "@/lib/types";

type FormState = {
  lastName: string;
  firstName: string;
  gender: Gender;
  profession: string;
  phone: string;
  registrationDate: string;
  validityDate: string;
  photoData: string | null;
  notes: string;
  regenerateNumber: boolean;
};

const empty = (): FormState => ({
  lastName: "",
  firstName: "",
  gender: "masculin",
  profession: "",
  phone: "+225 ",
  registrationDate: todayISO(),
  validityDate: addYearsISO(todayISO(), 1),
  photoData: null,
  notes: "",
  regenerateNumber: false,
});

function fromSubscriber(s: Subscriber): FormState {
  return {
    lastName: s.lastName,
    firstName: s.firstName,
    gender: s.gender,
    profession: s.profession ?? "",
    phone: s.phone,
    registrationDate: s.registrationDate,
    validityDate: s.validityDate,
    photoData: s.photoData,
    notes: s.notes ?? "",
    regenerateNumber: false,
  };
}

export function SubscriberForm({
  initial,
  nextNumber,
}: {
  initial?: Subscriber;
  nextNumber: string;
}) {
  const router = useRouter();
  const isEdit = Boolean(initial);
  const [form, setForm] = useState<FormState>(initial ? fromSubscriber(initial) : empty());
  const [previewNumber, setPreviewNumber] = useState(initial?.subscriptionNumber ?? nextNumber);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [saved, setSaved] = useState<Subscriber | null>(initial ?? null);
  const cardRef = useRef<HTMLDivElement>(null);
  const { branding } = useBranding();
  const cardSize = cardSizeMm(branding.cardWidth);

  useEffect(() => {
    if (!isEdit) setPreviewNumber(nextNumber);
  }, [isEdit, nextNumber]);

  const cardData: CardData = useMemo(
    () => ({
      lastName: form.lastName,
      firstName: form.firstName,
      profession: form.profession,
      phone: form.phone,
      subscriptionNumber: form.regenerateNumber ? nextNumber : previewNumber,
      validityDate: form.validityDate,
      gender: form.gender,
      photoData: form.photoData,
    }),
    [form, previewNumber, nextNumber],
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): string | null {
    if (!form.lastName.trim()) return "Le nom est obligatoire.";
    if (!form.firstName.trim()) return "Les prénoms sont obligatoires.";
    if (!form.phone.trim() || form.phone.trim() === "+225") return "Le contact téléphonique est obligatoire.";
    if (!form.validityDate) return "La date de validité est obligatoire.";
    return null;
  }

  async function save(): Promise<Subscriber | null> {
    const v = validate();
    if (v) {
      setError(v);
      return null;
    }
    setError(null);
    setSaving(true);
    try {
      const payload = {
        lastName: form.lastName,
        firstName: form.firstName,
        gender: form.gender,
        profession: form.profession,
        phone: form.phone,
        registrationDate: form.registrationDate,
        validityDate: form.validityDate,
        photoData: form.photoData,
        notes: form.notes,
        regenerateNumber: isEdit ? form.regenerateNumber : false,
      };
      const res = await apiFetch(isEdit && saved ? `/api/subscribers/${saved.id}` : "/api/subscribers", {
        method: isEdit && saved ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Enregistrement impossible.");
        return null;
      }
      const item = data.item as Subscriber;
      setSaved(item);
      setPreviewNumber(item.subscriptionNumber);
      setForm((prev) => ({ ...prev, regenerateNumber: false }));
      setMessage(`Abonné enregistré. Numéro ${item.subscriptionNumber}.`);
      return item;
    } catch {
      setError("Erreur réseau pendant l'enregistrement.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function ensureSaved() {
    if (saved && !isDirty(saved, form) && !form.regenerateNumber) return saved;
    return save();
  }

  async function onGenerate() {
    const item = await ensureSaved();
    if (!item) return;
    await apiFetch(`/api/subscribers/${item.id}/card`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate" }),
    });
    setShowPrint(true);
  }

  async function onDownload() {
    const item = await ensureSaved();
    if (!item) return;
    const el = cardRef.current?.querySelector(".membership-card") as HTMLElement | null;
    if (!el) {
      setError("Aperçu de carte introuvable.");
      return;
    }
    await downloadCardPdf(el, `carte-${item.subscriptionNumber}.pdf`, cardSize);
    await apiFetch(`/api/subscribers/${item.id}/card`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "download" }),
    });
    setMessage(`PDF téléchargé à l'échelle réelle (carte ${cardSizeLabel(branding.cardWidth)} sur A4 paysage).`);
  }

  async function onPrint() {
    const item = await ensureSaved();
    if (!item) return;
    await apiFetch(`/api/subscribers/${item.id}/card`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "print" }),
    });
    setShowPrint(true);
    setTimeout(() => window.print(), 250);
  }

  return (
    <div className="form-layout">
      <form
        className="panel form-panel"
        onSubmit={(e) => {
          e.preventDefault();
          void save().then((item) => {
            if (item && !isEdit) setShowPrint(true);
          });
        }}
      >
        <h3>Fiche de l&apos;abonné</h3>
        {message ? <div className="alert success">{message}</div> : null}
        {error ? <div className="alert error">{error}</div> : null}

        <div className="grid-2">
          <label className="field">
            <span>Nom *</span>
            <input
              value={form.lastName}
              onChange={(e) => update("lastName", e.target.value.toUpperCase())}
              required
              autoComplete="family-name"
            />
          </label>
          <label className="field">
            <span>Prénoms *</span>
            <input
              value={form.firstName}
              onChange={(e) => update("firstName", e.target.value)}
              required
              autoComplete="given-name"
            />
          </label>
        </div>

        <fieldset className="field">
          <legend>Sexe *</legend>
          <div className="gender-pills">
            <label className={form.gender === "masculin" ? "pill active green" : "pill"}>
              <input
                type="radio"
                name="gender"
                checked={form.gender === "masculin"}
                onChange={() => update("gender", "masculin")}
              />
              Masculin — modèle vert
            </label>
            <label className={form.gender === "feminin" ? "pill active gold" : "pill"}>
              <input
                type="radio"
                name="gender"
                checked={form.gender === "feminin"}
                onChange={() => update("gender", "feminin")}
              />
              Féminin — modèle doré
            </label>
          </div>
        </fieldset>

        <div className="grid-2">
          <label className="field">
            <span>Profession</span>
            <input value={form.profession} onChange={(e) => update("profession", e.target.value)} />
          </label>
          <label className="field">
            <span>Contact téléphonique *</span>
            <input
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              required
              inputMode="tel"
            />
          </label>
        </div>

        <div className="grid-3">
          <label className="field">
            <span>N° d&apos;abonnement</span>
            <input value={form.regenerateNumber ? nextNumber : previewNumber} readOnly />
          </label>
          <label className="field">
            <span>Date d&apos;enregistrement</span>
            <input type="date" value={form.registrationDate} readOnly />
          </label>
          <label className="field">
            <span>Date de validité *</span>
            <input
              type="date"
              value={form.validityDate}
              onChange={(e) => update("validityDate", e.target.value)}
              required
            />
          </label>
        </div>

        {isEdit ? (
          <label className="check">
            <input
              type="checkbox"
              checked={form.regenerateNumber}
              onChange={(e) => update("regenerateNumber", e.target.checked)}
            />
            Attribuer un nouveau numéro d&apos;abonnement (demande explicite)
          </label>
        ) : null}

        <label className="field">
          <span>Notes internes</span>
          <textarea rows={2} value={form.notes} onChange={(e) => update("notes", e.target.value)} />
        </label>

        <div className="field">
          <span>Photo d&apos;identité</span>
          <PhotoCapture value={form.photoData} onChange={(photo) => update("photoData", photo)} />
        </div>

        <div className="form-buttons">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer l'abonné"}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setForm(initial ? fromSubscriber(initial) : empty());
              setError(null);
              setMessage(null);
            }}
          >
            Réinitialiser le formulaire
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setShowPrint(true)}>
            Aperçu de la carte
          </button>
          <button type="button" className="btn btn-gold" onClick={() => void onGenerate()}>
            Générer la carte
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => void onDownload()}>
            Télécharger la carte PDF
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => void onPrint()}>
            Imprimer la carte
          </button>
        </div>
      </form>

      <aside className="preview-col">
        <div className="panel preview-panel">
          <div className="preview-head">
            <h3>Aperçu en temps réel</h3>
            <span className={`chip ${form.gender === "feminin" ? "chip-gold" : "chip-green"}`}>
              {form.gender === "feminin" ? "Modèle doré — féminin" : "Modèle vert — masculin"}
            </span>
          </div>
          <div className="preview-card" ref={cardRef}>
            <CardScaler scale={Math.min(1.55, 132 / cardSize.width)} size={cardSize}>
              <MembershipCard data={cardData} />
            </CardScaler>
          </div>
          <p className="hint">
            Carte imprimée {cardSizeLabel(branding.cardWidth)}. Impression : une seule carte au recto,
            centrée sur A4 paysage, à taille réelle, avec repères de coupe. Réglez la dimension dans Super
            admin — Paramètres.
          </p>
          {saved ? (
            <button type="button" className="btn btn-ghost btn-block" onClick={() => router.push(`/abonnes/${saved.id}`)}>
              Ouvrir la fiche enregistrée
            </button>
          ) : null}
        </div>
      </aside>

      {showPrint ? (
        <PrintPortal>
          <div className="print-overlay">
            <div className="print-toolbar no-print">
              <div>
                <strong>Aperçu A4 paysage</strong>
                <p>Imprimez à 100 % — sans ajuster à la page. Une seule carte, recto uniquement.</p>
              </div>
              <div className="print-toolbar-actions">
                <button type="button" className="btn btn-ghost" onClick={() => void onDownload()}>
                  Télécharger PDF
                </button>
                <button type="button" className="btn btn-primary" onClick={() => void onPrint()}>
                  Imprimer
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowPrint(false)}>
                  Fermer
                </button>
              </div>
            </div>
            <PrintSheet data={cardData} />
          </div>
        </PrintPortal>
      ) : null}
    </div>
  );
}

function isDirty(saved: Subscriber, form: FormState) {
  return (
    saved.lastName !== form.lastName.trim().toUpperCase() ||
    saved.firstName !== form.firstName.trim() ||
    saved.gender !== form.gender ||
    (saved.profession ?? "") !== form.profession ||
    saved.phone !== form.phone.trim() ||
    saved.validityDate !== form.validityDate ||
    saved.photoData !== form.photoData ||
    (saved.notes ?? "") !== form.notes
  );
}
