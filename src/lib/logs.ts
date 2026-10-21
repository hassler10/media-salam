import { db } from "@/db";
import { activityLogs } from "@/db/schema";

export async function logActivity(input: {
  action: string;
  details?: string;
  entityType?: string;
  entityId?: number;
  actor?: string;
}) {
  try {
    await db.insert(activityLogs).values({
      action: input.action,
      details: input.details ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      actor: input.actor ?? "système",
    });
  } catch (error) {
    console.error("Impossible d'enregistrer le journal :", error);
  }
}
