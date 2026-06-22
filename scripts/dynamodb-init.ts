import {
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";

const endpoint = process.env.DYNAMODB_ENDPOINT ?? "http://localhost:8000";
const tableName = process.env.TABLE_NAME ?? "walter-api-keys";

const client = new DynamoDBClient({
  endpoint,
  region: process.env.AWS_REGION ?? "us-east-1",
  credentials: { accessKeyId: "local", secretAccessKey: "local" },
});

async function tableExists(): Promise<boolean> {
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  if (await tableExists()) {
    console.log(`Table ${tableName} already exists`);
    return;
  }

  await client.send(
    new CreateTableCommand({
      TableName: tableName,
      BillingMode: "PAY_PER_REQUEST",
      AttributeDefinitions: [
        { AttributeName: "apiKeyHash", AttributeType: "S" },
        { AttributeName: "orderId", AttributeType: "S" },
        { AttributeName: "email", AttributeType: "S" },
        { AttributeName: "createdAt", AttributeType: "S" },
      ],
      KeySchema: [{ AttributeName: "apiKeyHash", KeyType: "HASH" }],
      GlobalSecondaryIndexes: [
        {
          IndexName: "orderId-index",
          KeySchema: [{ AttributeName: "orderId", KeyType: "HASH" }],
          Projection: { ProjectionType: "ALL" },
        },
        {
          IndexName: "email-index",
          KeySchema: [
            { AttributeName: "email", KeyType: "HASH" },
            { AttributeName: "createdAt", KeyType: "RANGE" },
          ],
          Projection: { ProjectionType: "ALL" },
        },
      ],
    }),
  );

  console.log(`Created table ${tableName}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
