"use client";

import { useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import type { ActivityLog } from "@/lib/types";
import { actionLabel, formatDateTimeFR } from "@/lib/utils";
import { apiFetch } from "@/lib/client-api";

export default function HistoriquePage() {
  const [items, setItems] = useState<ActivityLog[]>([]);

  useEffect(() => {
    void apiFetch("/api/logs")
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []));
  }, []);

  return (
    <AppShell>
      <PageHeader
        title="Historique des abonnements"
        subtitle="Journal des enregistrements, impressions, exports et opérations sensibles."
      />
      <div className="panel table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Opération</th>
              <th>Détails</th>
              <th>Acteur</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="empty">
                  Aucune opération enregistrée.
                </td>
              </tr>
            ) : (
              items.map((log) => (
                <tr key={log.id}>
                  <td>{formatDateTimeFR(log.createdAt)}</td>
                  <td>{actionLabel(log.action)}</td>
                  <td>{log.details || "—"}</td>
                  <td>{log.actor || "système"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
