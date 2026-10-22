"use client";

import { useState } from "react";
import type { Subscriber } from "@/lib/types";
import { fullName } from "@/lib/utils";
import { apiFetch } from "@/lib/client-api";

type Call = { path: string; init?: RequestInit };

async function execute({ path, init }: Call, fallback: string): Promise<string | null> {
  try {
    const res = await apiFetch(path, init);
    if (res.ok) return null;
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

type ButtonProps = { subscriber: Subscriber; afterAction: () => void };
type TrashProps = ButtonProps & { className?: string };

/** Envoie la fiche à la corbeille après confirmation. */
export function TrashSubscriberButton({ subscriber, afterAction, className }: TrashProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    const message = await execute(
      { path: `/api/subscribers/${subscriber.id}`, init: { method: "DELETE" } },
      "Suppression impossible.",
    );
    setBusy(false);
    if (message) {
      setError(message);
      return;
    }
    setOpen(false);
    afterAction();
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        Supprimer
      </button>
      {open ? (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Envoyer à la corbeille</h3>
            <p>
              Retirer de la circulation la fiche {fullName(subscriber.lastName, subscriber.firstName)} (
              {subscriber.subscriptionNumber}) ? Elle reste récupérable dans la corbeille de la liste des
              abonnés.
            </p>
            {error ? <div className="alert error">{error}</div> : null}
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                Annuler
              </button>
              <button type="button" className="btn btn-danger" disabled={busy} onClick={() => void confirm()}>
                {busy ? "Suppression…" : "Mettre à la corbeille"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function RestoreSubscriberButton({ subscriber, afterAction }: ButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function restore() {
    setBusy(true);
    const message = await execute(
      {
        path: `/api/subscribers/${subscriber.id}/trash`,
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "restore" }),
        },
      },
      "Restauration impossible.",
    );
    setBusy(false);
    if (message) {
      setError(message);
      return;
    }
    afterAction();
  }

  return (
    <>
      {error ? <span className="muted">{error}</span> : null}
      <button type="button" disabled={busy} onClick={() => void restore()}>
        {busy ? "…" : "Restaurer"}
      </button>
    </>
  );
}

/** Suppression définitive : le numéro d'abonnement doit être retapé. */
export function PurgeSubscriberButton({ subscriber, afterAction }: ButtonProps) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matches = typed.trim().toUpperCase() === subscriber.subscriptionNumber.toUpperCase();

  async function purge() {
    setBusy(true);
    const message = await execute(
      {
        path: `/api/subscribers/${subscriber.id}/trash`,
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "purge", confirm: typed }),
        },
      },
      "Purge impossible.",
    );
    setBusy(false);
    if (message) {
      setError(message);
      return;
    }
    setOpen(false);
    setTyped("");
    afterAction();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Supprimer définitivement
      </button>
      {open ? (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Suppression définitive</h3>
            <p>
              Effacer pour de bon {fullName(subscriber.lastName, subscriber.firstName)} (
              {subscriber.subscriptionNumber}) et sa photo. Plus aucun retour en arrière possible.
            </p>
            <label className="field">
              <span>Retapez le numéro {subscriber.subscriptionNumber}</span>
              <input
                className="mono"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={subscriber.subscriptionNumber}
              />
            </label>
            {error ? <div className="alert error">{error}</div> : null}
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                Annuler
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={busy || !matches}
                onClick={() => void purge()}
              >
                {busy ? "Suppression…" : "Supprimer définitivement"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
