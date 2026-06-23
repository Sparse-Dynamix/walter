import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";
import * as React from "react";

export interface ApiKeyRevokedEmailProps {
  productName: string;
  productLabel: string;
  recipientEmail: string;
  reason: "cancelled" | "refunded";
}

function reasonText(reason: "cancelled" | "refunded"): string {
  if (reason === "cancelled") {
    return "your order was cancelled";
  }
  return "a refund was processed for your order";
}

export function ApiKeyRevokedEmail({
  productName,
  productLabel,
  recipientEmail,
  reason,
}: ApiKeyRevokedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your {productName} API key has been revoked</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>
            Your {productName} API Key Has Been Revoked
          </Heading>
          <Text>Hi,</Text>
          <Text>
            Access for <strong>{productLabel}</strong> ({recipientEmail}) has
            been revoked because {reasonText(reason)}.
          </Text>
          <Text>
            Your API key is no longer valid. The /api/check endpoint will reject
            it.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default ApiKeyRevokedEmail;

const main = { backgroundColor: "#f6f9fc", fontFamily: "sans-serif" };
const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "24px",
  maxWidth: "560px",
};
const heading = { fontSize: "24px", fontWeight: "bold" as const };
