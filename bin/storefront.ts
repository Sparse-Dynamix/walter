#!/usr/bin/env node
import { loadEnv } from "../lib/load-env.js";

loadEnv();

import * as cdk from "aws-cdk-lib/core";
import {
  resolveProductConfig,
  toStackConstructId,
} from "../lib/product-config.js";
import { StorefrontStack } from "../lib/storefront-stack.js";
import type { DeployMode } from "../lib/types.js";

const app = new cdk.App();
const mode = (app.node.tryGetContext("mode") ??
  process.env.DEPLOY_MODE ??
  "dev") as DeployMode;

const config = resolveProductConfig();
const stackId = toStackConstructId(config.productSlug);

new StorefrontStack(app, stackId, {
  ...config,
  mode,
  env:
    mode === "prod"
      ? {
          account: process.env.CDK_DEFAULT_ACCOUNT,
          region: process.env.CDK_DEFAULT_REGION,
        }
      : undefined,
});
