import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { Construct } from "constructs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ShopifySubscriptionProduct, WalterMode } from "../types.js";
import { runShopifySetup } from "../shopify/setup.js";

export type { ShopifySubscriptionProduct };

export interface ShopifyStorefrontProps {
  mode: WalterMode;
  subscriptionProducts: ShopifySubscriptionProduct[];
  senderEmail: string;
  tableName?: string;
}

export class ShopifyStorefront extends Construct {
  public readonly subscriptionProducts: ShopifySubscriptionProduct[];
  public readonly table?: dynamodb.Table;
  public readonly apiUrl?: string;
  public readonly httpApi?: apigwv2.HttpApi;
  public readonly apiFunction?: NodejsFunction;

  constructor(scope: Construct, id: string, props: ShopifyStorefrontProps) {
    super(scope, id);

    this.subscriptionProducts = props.subscriptionProducts;
    const tableName = props.tableName ?? "walter-api-keys";

    runShopifySetup(props.subscriptionProducts);

    if (props.mode === "dev") {
      return;
    }

    this.table = new dynamodb.Table(this, "ApiKeysTable", {
      tableName,
      partitionKey: { name: "apiKeyHash", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.table.addGlobalSecondaryIndex({
      indexName: "orderId-index",
      partitionKey: { name: "orderId", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.table.addGlobalSecondaryIndex({
      indexName: "email-index",
      partitionKey: { name: "email", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "createdAt", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const repoRoot = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../..",
    );
    const webhookSecretValue = process.env.SHOPIFY_WEBHOOK_SECRET ?? "unset";

    this.apiFunction = new NodejsFunction(this, "ApiFunction", {
      entry: path.join(repoRoot, "api/handler.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        TABLE_NAME: this.table.tableName,
        SENDER_EMAIL: props.senderEmail,
        SHOPIFY_WEBHOOK_SECRET: webhookSecretValue,
      },
      bundling: {
        minify: true,
        sourceMap: true,
        loader: { ".tsx": "tsx" },
        commandHooks: {
          beforeBundling(): string[] {
            return [];
          },
          beforeInstall(): string[] {
            return [];
          },
          afterBundling(inputDir: string, outputDir: string): string[] {
            return [
              `cp -r ${inputDir}/emails ${outputDir}/emails 2>/dev/null || true`,
            ];
          },
        },
      },
    });

    this.table.grantReadWriteData(this.apiFunction);

    this.apiFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ses:SendEmail", "ses:SendRawEmail"],
        resources: ["*"],
      }),
    );

    this.httpApi = new apigwv2.HttpApi(this, "HttpApi", {
      apiName: "walter-api",
    });

    const integration = new HttpLambdaIntegration(
      "LambdaIntegration",
      this.apiFunction,
    );

    const routes: Array<{ path: string; methods: apigwv2.HttpMethod[] }> = [
      { path: "/webhooks/orders-paid", methods: [apigwv2.HttpMethod.POST] },
      {
        path: "/webhooks/orders-cancelled",
        methods: [apigwv2.HttpMethod.POST],
      },
      { path: "/webhooks/refunds-create", methods: [apigwv2.HttpMethod.POST] },
      {
        path: "/api/check",
        methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST],
      },
      { path: "/health", methods: [apigwv2.HttpMethod.GET] },
    ];

    for (const route of routes) {
      this.httpApi.addRoutes({
        path: route.path,
        methods: route.methods,
        integration,
      });
    }

    this.apiUrl = this.httpApi.url;

    new cdk.CfnOutput(this, "ApiUrl", { value: this.apiUrl ?? "" });
    new cdk.CfnOutput(this, "TableName", { value: this.table.tableName });
  }
}
