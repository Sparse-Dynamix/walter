#!/usr/bin/env node
import * as cdk from "aws-cdk-lib/core";
import { WalterStack } from "../lib/walter-stack.js";
import type { WalterMode } from "../lib/types.js";

const app = new cdk.App();
const mode = (app.node.tryGetContext("mode") ??
  process.env.WALTER_MODE ??
  "dev") as WalterMode;

new WalterStack(app, "WalterStack", {
  mode,
  env:
    mode === "prod"
      ? {
          account: process.env.CDK_DEFAULT_ACCOUNT,
          region: process.env.CDK_DEFAULT_REGION,
        }
      : undefined,
});
