"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import type { Subscriber } from "@/lib/types";
import { fullName } from "@/lib/utils";
import { apiFetch } from "@/lib/client-api";

async function call(path: string, fallback: string, init?: RequestInit): Promise<string | null> {
  try {
    const res = await apiFetch(path, init);
    if (res.ok) return null;
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

const jsonPost = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

type ButtonProps = { subscriber: Subscriber; afterAction: () => void };
type TrashProps = ButtonProps & { className?: string };

/** Envoie la fiche à la corbeille après confirmation. */
export function TrashSubscriberButton({ subscriber, afterAction, className }: TrashProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    const message = await call(`/api/subscribers/${subscriber.id}`, "Suppression impossible.", {
      method: "DELETE",
    });
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
      <button type="button" className={className ?? "danger"} onClick={() => setOpen(true)}>
        Supprimer
      </button>
      {open ? (
        <Modal
          title="Envoyer à la corbeille"
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                Annuler
              </button>
              <button type="button" className="btn btn-danger" disabled={busy} onClick={() => void confirm()}>
                {busy ? "Suppression…" : "Mettre à la corbeille"}
              </button>
            </>
          }
        >
          <p>
            Retirer de la circulation la fiche {fullName(subscriber.lastName, subscriber.firstName)} (
            {subscriber.subscriptionNumber}) ? Elle reste récupérable dans la corbeille de la liste des
            abonnés.
          </p>
          {error ? <div className="alert error">{error}</div> : null}
        </Modal>
      ) : null}
    </>
  );
}

export function RestoreSubscriberButton({ subscriber, afterAction }: ButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function restore() {
    setBusy(true);
    const message = await call(
      `/api/subscribers/${subscriber.id}/trash`,
      "Restauration impossible.",
      jsonPost({ action: "restore" }),
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
      {error ? (
        <span className="muted nowrap">{error}</span>
      ) : (
        <button type="button" disabled={busy} onClick={() => void restore()}>
          {busy ? "Restauration…" : "Restaurer"}
        </button>
      )}
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
    const message = await call(
      `/api/subscribers/${subscriber.id}/trash`,
      "Purge impossible.",
      jsonPost({ action: "purge", confirm: typed }),
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
      <button type="button" className="danger" onClick={() => setOpen(true)}>
        Supprimer définitivement
      </button>
      {open ? (
        <Modal
          title="Suppression définitive"
          footer={
            <>
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
            </>
          }
        >
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
        </Modal>
      ) : null}
    </>
  );
}
