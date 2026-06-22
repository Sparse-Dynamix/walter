import * as cdk from "aws-cdk-lib/core";
import { Construct } from "constructs";
import { ShopifyStorefront } from "./constructs/shopify-storefront.js";
import type { WalterMode } from "./types.js";

export interface WalterStackProps extends cdk.StackProps {
  mode: WalterMode;
}

export class WalterStack extends cdk.Stack {
  public readonly storefront: ShopifyStorefront;

  constructor(scope: Construct, id: string, props: WalterStackProps) {
    super(scope, id, props);

    this.storefront = new ShopifyStorefront(this, "Storefront", {
      mode: props.mode,
      subscriptionProducts: [
        { label: "Walter Starter", price: 9 },
        { label: "Walter Pro", price: 29 },
      ],
      senderEmail: process.env.SENDER_EMAIL ?? "noreply@example.com",
    });
  }
}
