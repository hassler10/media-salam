import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { guardEntries } from "@/db/schema";

function windowSql(windowMs: number) {
  return sql`now() - make_interval(secs => ${windowMs / 1000})`;
}

/**
 * Compteur en base : une seule instance serverless ne connaît pas les autres,
 * un cache mémoire ne suffirait donc pas. L'horloge utilisée est celle de Postgres.
 */
export async function bumpGuard(key: string, windowMs: number): Promise<number> {
  const rows = await db
    .insert(guardEntries)
    .values({ key, count: 1, startedAt: sql`now()` })
    .onConflictDoUpdate({
      target: guardEntries.key,
      set: {
        count: sql`case when ${guardEntries.startedAt} < ${windowSql(windowMs)} then 1 else ${guardEntries.count} + 1 end`,
        startedAt: sql`case when ${guardEntries.startedAt} < ${windowSql(windowMs)} then now() else ${guardEntries.startedAt} end`,
      },
    })
    .returning({ count: guardEntries.count });

  const count = rows[0]?.count ?? 1;
  if (count === 1) {
    await db.delete(guardEntries).where(sql`${guardEntries.startedAt} < now() - interval '1 day'`);
  }
  return count;
}

export async function guardCount(key: string, windowMs: number): Promise<number> {
  const rows = await db
    .select({ count: guardEntries.count })
    .from(guardEntries)
    .where(and(eq(guardEntries.key, key), sql`${guardEntries.startedAt} >= ${windowSql(windowMs)}`))
    .limit(1);
  return rows[0]?.count ?? 0;
}

export async function clearGuard(key: string): Promise<void> {
  await db.delete(guardEntries).where(eq(guardEntries.key, key));
}

/** Vrai lorsque la limite vient justement d'être dépassée. */
export async function overLimit(key: string, max: number, windowMs: number): Promise<boolean> {
  return (await bumpGuard(key, windowMs)) > max;
}
