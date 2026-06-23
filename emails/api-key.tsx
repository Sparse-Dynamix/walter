import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

export interface ApiKeyEmailProps {
  apiKey: string;
  productName: string;
  productLabel: string;
  recipientEmail: string;
}

export function ApiKeyEmail({
  apiKey,
  productName,
  productLabel,
  recipientEmail,
}: ApiKeyEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Your {productName} API key for {productLabel}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Your {productName} API Key</Heading>
          <Text>Hi,</Text>
          <Text>
            Thanks for purchasing <strong>{productLabel}</strong>. Here is your
            API key for {recipientEmail}:
          </Text>
          <Section style={codeBox}>
            <Text style={code}>{apiKey}</Text>
          </Section>
          <Text>
            Keep this key secret. Use the /api/check endpoint to verify your
            key.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default ApiKeyEmail;

const main = { backgroundColor: "#f6f9fc", fontFamily: "sans-serif" };
const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "24px",
  maxWidth: "560px",
};
const heading = { fontSize: "24px", fontWeight: "bold" as const };
const codeBox = {
  backgroundColor: "#f4f4f5",
  padding: "16px",
  borderRadius: "8px",
};
const code = {
  fontFamily: "monospace",
  fontSize: "14px",
  wordBreak: "break-all" as const,
};
