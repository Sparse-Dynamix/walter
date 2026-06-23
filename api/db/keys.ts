import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient } from "./client.js";
import { getTableName } from "../lib/config.js";
import { hashApiKey } from "../lib/hash.js";

export type KeyStatus = "active" | "revoked";

export interface ApiKeyRecord {
  apiKeyHash: string;
  email: string;
  orderId: string;
  status: KeyStatus;
  productLabel?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RevokedKey {
  email: string;
  productLabel?: string;
}

export async function getKeyByHash(
  apiKeyHash: string,
): Promise<ApiKeyRecord | undefined> {
  const result = await docClient.send(
    new GetCommand({
      TableName: getTableName(),
      Key: { apiKeyHash },
    }),
  );
  return result.Item as ApiKeyRecord | undefined;
}

export async function getKeysByOrderId(
  orderId: string,
): Promise<ApiKeyRecord[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: getTableName(),
      IndexName: "orderId-index",
      KeyConditionExpression: "orderId = :orderId",
      ExpressionAttributeValues: { ":orderId": orderId },
    }),
  );
  return (result.Items ?? []) as ApiKeyRecord[];
}

export async function createApiKey(params: {
  apiKey: string;
  email: string;
  orderId: string;
  productLabel?: string;
}): Promise<ApiKeyRecord> {
  const now = new Date().toISOString();
  const record: ApiKeyRecord = {
    apiKeyHash: hashApiKey(params.apiKey),
    email: params.email,
    orderId: params.orderId,
    status: "active",
    productLabel: params.productLabel,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: getTableName(),
      Item: record,
      ConditionExpression: "attribute_not_exists(apiKeyHash)",
    }),
  );

  return record;
}

export async function revokeKeysByOrderId(
  orderId: string,
): Promise<RevokedKey[]> {
  const keys = await getKeysByOrderId(orderId);
  const now = new Date().toISOString();
  const revoked: RevokedKey[] = [];

  for (const key of keys) {
    if (key.status === "revoked") {
      continue;
    }
    await docClient.send(
      new UpdateCommand({
        TableName: getTableName(),
        Key: { apiKeyHash: key.apiKeyHash },
        UpdateExpression: "SET #status = :revoked, updatedAt = :now",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":revoked": "revoked", ":now": now },
      }),
    );
    revoked.push({ email: key.email, productLabel: key.productLabel });
  }

  return revoked;
}

export async function isOrderAlreadyVended(orderId: string): Promise<boolean> {
  const keys = await getKeysByOrderId(orderId);
  return keys.some((k) => k.status === "active");
}

export async function checkApiKey(apiKey: string): Promise<boolean> {
  const record = await getKeyByHash(hashApiKey(apiKey));
  return record?.status === "active";
}
