import * as cdk from "aws-cdk-lib/core";
import { Construct } from "constructs";
import { ShopifyStorefront } from "./constructs/shopify-storefront.js";
import type { ProductConfig } from "./product-config.js";
import { storefrontStackName } from "./product-config.js";
import type { DeployMode } from "./types.js";

export interface StorefrontStackProps extends cdk.StackProps, ProductConfig {
  mode: DeployMode;
}

export class StorefrontStack extends cdk.Stack {
  public readonly storefront: ShopifyStorefront;

  constructor(scope: Construct, id: string, props: StorefrontStackProps) {
    super(scope, id, {
      ...props,
      stackName: props.stackName ?? storefrontStackName(props.productSlug),
    });

    this.storefront = new ShopifyStorefront(this, "Storefront", {
      mode: props.mode,
      productName: props.productName,
      productSlug: props.productSlug,
      senderDomain: props.senderDomain,
      senderEmail: props.senderEmail,
      subscriptionProducts: [
        { label: "Starter", price: 9 },
        { label: "Pro", price: 29 },
      ],
    });
  }
}
