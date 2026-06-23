import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { render } from "@react-email/render";
import { ApiKeyEmail } from "../../emails/api-key.js";
import { ApiKeyRevokedEmail } from "../../emails/api-key-revoked.js";
import { loadEnv } from "../../lib/load-env.js";
import type { RevokedKey } from "../db/keys.js";
import { getProductName, getSenderEmail } from "./config.js";

function createSesClient(): SESv2Client {
  loadEnv();
  const endpoint = process.env.SES_ENDPOINT;
  if (endpoint) {
    return new SESv2Client({
      endpoint,
      region: "aws-ses-v2-local",
      credentials: {
        accessKeyId: "ANY_STRING",
        secretAccessKey: "ANY_STRING",
      },
    });
  }
  return new SESv2Client({});
}

export async function sendApiKeyEmail(params: {
  apiKey: string;
  productLabel: string;
  recipientEmail: string;
}): Promise<void> {
  const productName = getProductName();
  const html = await render(
    ApiKeyEmail({
      apiKey: params.apiKey,
      productName,
      productLabel: params.productLabel,
      recipientEmail: params.recipientEmail,
    }),
  );

  const client = createSesClient();
  await client.send(
    new SendEmailCommand({
      FromEmailAddress: getSenderEmail(),
      Destination: { ToAddresses: [params.recipientEmail] },
      Content: {
        Simple: {
          Subject: {
            Data: `Your ${productName} API key for ${params.productLabel}`,
          },
          Body: { Html: { Data: html } },
        },
      },
    }),
  );
}

export async function sendApiKeyRevokedEmail(params: {
  productLabel: string;
  recipientEmail: string;
  reason: "cancelled" | "refunded";
}): Promise<void> {
  const productName = getProductName();
  const productLabel = params.productLabel ?? "your subscription";
  const html = await render(
    ApiKeyRevokedEmail({
      productName,
      productLabel,
      recipientEmail: params.recipientEmail,
      reason: params.reason,
    }),
  );

  const client = createSesClient();
  await client.send(
    new SendEmailCommand({
      FromEmailAddress: getSenderEmail(),
      Destination: { ToAddresses: [params.recipientEmail] },
      Content: {
        Simple: {
          Subject: { Data: `Your ${productName} API key has been revoked` },
          Body: { Html: { Data: html } },
        },
      },
    }),
  );
}

export async function notifyRevokedKeys(
  keys: RevokedKey[],
  reason: "cancelled" | "refunded",
): Promise<void> {
  if (keys.length === 0) {
    return;
  }

  const seen = new Set<string>();
  for (const key of keys) {
    const dedupeKey = `${key.email}:${key.productLabel ?? ""}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);
    await sendApiKeyRevokedEmail({
      productLabel: key.productLabel ?? "your subscription",
      recipientEmail: key.email,
      reason,
    });
  }
}
