"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell, PageHeader } from "@/components/app-shell";
import type { AdminAccount, MaintenanceStatus } from "@/lib/types";
import { formatDateTimeFR } from "@/lib/utils";
import { apiFetch } from "@/lib/client-api";

export default function MaintenancePage() {
  const router = useRouter();
  const [status, setStatus] = useState<MaintenanceStatus | null>(null);
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publicBaseUrl, setPublicBaseUrl] = useState("");
  const [adminForm, setAdminForm] = useState({ username: "", password: "", displayName: "" });
  const [pwdForm, setPwdForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });

  async function refresh() {
    const [s, a, st] = await Promise.all([
      apiFetch("/api/maintenance/status").then((r) => r.json()),
      apiFetch("/api/admins").then((r) => r.json()),
      apiFetch("/api/settings").then((r) => r.json()),
    ]);
    setStatus(s.status);
    setAdmins(a.items ?? []);
    setPublicBaseUrl(st.settings?.publicBaseUrl ?? "");
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function readError(res: Response) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setError(data.error || "Opération refusée par le serveur.");
  }

  async function exportCsv() {
    const res = await apiFetch("/api/subscribers/export");
    if (!res.ok) {
      await readError(res);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "abonnes-bibliotheque-salam.csv";
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Export CSV téléchargé.");
  }

  async function backup() {
    const res = await apiFetch("/api/backup");
    if (!res.ok) {
      await readError(res);
      return;
    }
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sauvegarde-bms-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Sauvegarde JSON téléchargée (fiches, journaux, réglages — sans les visages).");
    void refresh();
  }

  async function archivePhotos() {
    const res = await apiFetch("/api/backup/photos");
    if (!res.ok) {
      await readError(res);
      return;
    }
    const data = (await res.json()) as { count?: number };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `visages-bms-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage(`Archive des visages téléchargée (${data.count ?? 0}) : conservez-la hors ligne, elle vaut pour photo d'identité.`);
  }

  async function importCsv(file: File) {
    const fd = new FormData();
    fd.set("file", file);
    const res = await apiFetch("/api/subscribers/import", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Import impossible.");
      return;
    }
    setMessage(`Import terminé : ${data.created} créés, ${data.skipped} ignorés.`);
    void refresh();
  }

  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await apiFetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicBaseUrl }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Enregistrement impossible (réservé au super administrateur).");
      return;
    }
    setMessage("Lien de la bibliothèque numérique enregistré : les QR codes des cartes l’utiliseront.");
  }

  async function createAdmin(e: FormEvent) {
    e.preventDefault();
    const res = await apiFetch("/api/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(adminForm),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Création impossible.");
      return;
    }
    setAdminForm({ username: "", password: "", displayName: "" });
    setMessage("Compte administrateur créé.");
    void refresh();
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (pwdForm.newPassword !== pwdForm.confirm) {
      setError("La confirmation ne correspond pas au nouveau mot de passe.");
      return;
    }
    const res = await apiFetch("/api/auth/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Modification impossible.");
      return;
    }
    setPwdForm({ currentPassword: "", newPassword: "", confirm: "" });
    // La session est révoquée par le serveur : on repart de la connexion.
    router.replace("/login");
  }

  return (
    <AppShell>
      <PageHeader
        title="Maintenance numérique"
        subtitle="Contrôle des données, sauvegardes, imports et comptes autorisés."
      />
      {message ? <div className="alert success">{message}</div> : null}
      {error ? <div className="alert error">{error}</div> : null}

      <section className="stat-grid">
        <article className="stat-card">
          <span>Base de données</span>
          <strong className={status?.database === "ok" ? "ok" : "bad"}>
            {status?.database === "ok" ? "Connectée" : "Erreur"}
          </strong>
          <small>{status?.databaseMessage}</small>
        </article>
        <article className="stat-card">
          <span>Abonnés</span>
          <strong>{status?.subscriberCount ?? "—"}</strong>
        </article>
        <article className="stat-card">
          <span>À la corbeille</span>
          <strong>{status?.trashCount ?? "—"}</strong>
          <small>
            <Link href="/abonnes?filter=supprimes">Restaurer ou purger</Link>
          </small>
        </article>
        <article className="stat-card">
          <span>Doublons de numéros</span>
          <strong>{status?.duplicateNumbers.length ?? 0}</strong>
        </article>
        <article className="stat-card">
          <span>Photos manquantes</span>
          <strong>{status?.missingPhotos ?? "—"}</strong>
        </article>
        <article className="stat-card">
          <span>Photos sans accord</span>
          <strong className={status?.photosWithoutConsent ? "bad" : "ok"}>
            {status?.photosWithoutConsent ?? "—"}
          </strong>
          <small>
            <Link href="/abonnes?filter=sans-consent">Confirmer l&apos;accord ou retirer la photo</Link>
          </small>
        </article>
        <article className="stat-card">
          <span>Visages à revoir</span>
          <strong className={status?.expiredPhotos ? "bad" : "ok"}>{status?.expiredPhotos ?? "—"}</strong>
          <small>
            <Link href="/abonnes?filter=expires">Abonnements expirés : renouveler ou purger</Link>
          </small>
        </article>
        <article className="stat-card">
          <span>Erreurs de cartes</span>
          <strong>{status?.cardErrorCount ?? 0}</strong>
        </article>
        <article className="stat-card">
          <span>Dernière sauvegarde</span>
          <strong className="small-strong">
            {status?.lastBackup ? formatDateTimeFR(status.lastBackup) : "Jamais"}
          </strong>
        </article>
      </section>

      {status?.duplicateNumbers.length ? (
        <div className="alert error">
          Doublons détectés : {status.duplicateNumbers.join(", ")}
        </div>
      ) : null}

      <div className="dash-grid">
        <div className="panel">
          <h3>Sauvegardes et échanges</h3>
          <p className="muted">
            Les fiches et les réglages sont dans PostgreSQL. La sauvegarde JSON ne contient plus les
            visages : ils ont une archive à part, réservée au super administrateur, plafonnée et notée
            dans le journal. Conservez ces fichiers hors ligne et protégés.
          </p>
          <div className="form-buttons">
            <button type="button" className="btn btn-primary" onClick={() => void backup()}>
              Télécharger une sauvegarde JSON (sans les visages)
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => void archivePhotos()}>
              Archiver les visages (super admin)
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => void exportCsv()}>
              Exporter les abonnés en CSV
            </button>
            <label className="btn btn-ghost">
              Importer un CSV
              <input
                type="file"
                accept=".csv,text/csv"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void importCsv(file);
                }}
              />
            </label>
          </div>
        </div>

        <div className="panel">
          <h3>Adresse de la bibliothèque numérique</h3>
          <p className="muted">
            Le QR code gravé sur la carte d’abonnement ouvre ce lien à l’abonné. Laissez vide tant
            que le développeur de la bibliothèque numérique ne l’a pas fourni.
          </p>
          <form onSubmit={(e) => void saveSettings(e)} className="stack">
            <label className="field">
              <span>Lien de la bibliothèque numérique</span>
              <input
                placeholder="https://… (lien fourni par le développeur)"
                value={publicBaseUrl}
                onChange={(e) => setPublicBaseUrl(e.target.value)}
              />
            </label>
            <button type="submit" className="btn btn-gold">
              Enregistrer l&apos;adresse
            </button>
          </form>
        </div>
      </div>

      <div className="dash-grid" style={{ marginTop: 20 }}>
        <div className="panel">
          <h3>Comptes administrateurs</h3>
          <ul className="people-list">
            {admins.map((a) => (
              <li key={a.id}>
                <span className="thumb initials">{a.displayName.slice(0, 1)}</span>
                <div>
                  <strong>{a.displayName}</strong>
                  <span>
                    {a.username} · {a.role}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel">
          <h3>Nouveau compte</h3>
          <form onSubmit={(e) => void createAdmin(e)} className="stack">
            <label className="field">
              <span>Nom affiché</span>
              <input
                value={adminForm.displayName}
                onChange={(e) => setAdminForm((p) => ({ ...p, displayName: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>Identifiant</span>
              <input
                value={adminForm.username}
                onChange={(e) => setAdminForm((p) => ({ ...p, username: e.target.value }))}
                required
              />
            </label>
            <label className="field">
              <span>Mot de passe (8 caractères min.)</span>
              <input
                type="password"
                value={adminForm.password}
                onChange={(e) => setAdminForm((p) => ({ ...p, password: e.target.value }))}
                required
              />
            </label>
            <button type="submit" className="btn btn-primary">
              Créer le compte
            </button>
          </form>
        </div>
        <div className="panel">
          <h3>Mon mot de passe</h3>
          <form onSubmit={(e) => void changePassword(e)} className="stack">
            <label className="field">
              <span>Mot de passe actuel</span>
              <input
                type="password"
                value={pwdForm.currentPassword}
                onChange={(e) => setPwdForm((p) => ({ ...p, currentPassword: e.target.value }))}
                autoComplete="current-password"
                required
              />
            </label>
            <label className="field">
              <span>Nouveau mot de passe (8 caractères min.)</span>
              <input
                type="password"
                value={pwdForm.newPassword}
                onChange={(e) => setPwdForm((p) => ({ ...p, newPassword: e.target.value }))}
                autoComplete="new-password"
                required
              />
            </label>
            <label className="field">
              <span>Confirmer le nouveau mot de passe</span>
              <input
                type="password"
                value={pwdForm.confirm}
                onChange={(e) => setPwdForm((p) => ({ ...p, confirm: e.target.value }))}
                autoComplete="new-password"
                required
              />
            </label>
            <button type="submit" className="btn btn-gold">
              Modifier mon mot de passe
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
