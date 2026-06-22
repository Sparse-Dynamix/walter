import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { render } from "@react-email/render";
import { ApiKeyEmail } from "../../emails/api-key.js";
import { getSenderEmail } from "./config.js";
import { loadEnv } from "../../lib/load-env.js";

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
  const html = await render(
    ApiKeyEmail({
      apiKey: params.apiKey,
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
          Subject: { Data: `Your API key for ${params.productLabel}` },
          Body: { Html: { Data: html } },
        },
      },
    }),
  );
}
