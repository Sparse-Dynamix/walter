import { Hono } from "hono";
import { checkApiKey } from "../db/keys.js";

export const checkRoutes = new Hono();

checkRoutes.get("/api/check", async (c) => {
  const key = extractKey(c.req.query("key"), c.req.header("Authorization"));
  if (!key) {
    return c.json({ valid: false, error: "Missing API key" }, 400);
  }
  const valid = await checkApiKey(key);
  return c.json({ valid });
});

checkRoutes.post("/api/check", async (c) => {
  const body = await c.req
    .json<{ key?: string }>()
    .catch(() => ({ key: undefined }));
  const key = extractKey(body.key, c.req.header("Authorization"));
  if (!key) {
    return c.json({ valid: false, error: "Missing API key" }, 400);
  }
  const valid = await checkApiKey(key);
  return c.json({ valid });
});

function extractKey(
  queryKey: string | undefined,
  authorization: string | undefined,
): string | undefined {
  if (queryKey) {
    return queryKey;
  }
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }
  return undefined;
}
