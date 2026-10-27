import { createHmac, randomUUID } from "node:crypto";
import type { Subscriber } from "@/lib/types";

export type LibraryWebhookResult = "sent" | "disabled" | "failed";
export type LibraryWebhookEvent = "subscriber.changed" | "registry.refresh";

const DEFAULT_ENDPOINT = "https://salam-library-pro.vercel.app/api/webhooks/media-salam";

/** Notifie Salam Library sans inclure de photo ni de note libre dans le message. */
export async function notifyLibrary(
  type: LibraryWebhookEvent,
  subscriber?: Subscriber,
): Promise<LibraryWebhookResult> {
  const secret = process.env.SALAM_LIBRARY_WEBHOOK_SECRET ?? "";
  if (!secret) return "disabled";
  if (secret.length < 32) return "failed";

  const configuredEndpoint = process.env.SALAM_LIBRARY_WEBHOOK_URL?.trim();
  if (!configuredEndpoint && process.env.NODE_ENV !== "production") return "disabled";
  const endpoint = configuredEndpoint || DEFAULT_ENDPOINT;
  try {
    const url = new URL(endpoint);
    const allowedHost =
      url.hostname === "salam-library-pro.vercel.app" ||
      (process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(url.hostname));
    if (
      url.protocol !== (url.hostname === "localhost" || url.hostname === "127.0.0.1" ? "http:" : "https:") ||
      url.pathname !== "/api/webhooks/media-salam" ||
      !allowedHost ||
      url.port !== "" ||
      url.username !== "" ||
      url.password !== "" ||
      url.search ||
      url.hash
    ) return "failed";

    const eventId = randomUUID();
    const payload = {
      eventId,
      occurredAt: new Date().toISOString(),
      type,
      ...(type === "subscriber.changed" && subscriber
        ? {
            subscriber: {
              id: subscriber.id,
              subscriptionNumber: subscriber.subscriptionNumber,
              lastName: subscriber.lastName,
              firstName: subscriber.firstName,
              phone: subscriber.phone,
              profession: subscriber.profession,
              registrationDate: subscriber.registrationDate,
              validityDate: subscriber.validityDate,
              deletedAt: subscriber.deletedAt,
              isDemo: subscriber.isDemo,
            },
          }
        : {}),
    };
    if (type === "subscriber.changed" && !subscriber) return "failed";

    const body = JSON.stringify(payload);
    const timestamp = String(Date.now());
    const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-media-salam-timestamp": timestamp,
        "x-media-salam-signature": signature,
      },
      body,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      console.warn("library_webhook_delivery_failed", { status: response.status, type });
      return "failed";
    }
    return "sent";
  } catch {
    console.warn("library_webhook_delivery_failed", { type });
    return "failed";
  }
}
