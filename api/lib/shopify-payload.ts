export interface ShopifyOrderPayload {
  id: number;
  email?: string;
  contact_email?: string;
  customer?: { email?: string };
  line_items?: Array<{ title?: string; name?: string }>;
}

export function extractOrderId(payload: ShopifyOrderPayload): string {
  return String(payload.id);
}

export function extractCustomerEmail(
  payload: ShopifyOrderPayload,
): string | undefined {
  return payload.email ?? payload.contact_email ?? payload.customer?.email;
}

export function extractProductLabel(payload: ShopifyOrderPayload): string {
  const first = payload.line_items?.[0];
  return first?.title ?? first?.name ?? "Subscription";
}

export interface ShopifyRefundPayload {
  order_id?: number;
  id?: number;
}

export function extractRefundOrderId(
  payload: ShopifyRefundPayload,
): string | undefined {
  if (payload.order_id != null) {
    return String(payload.order_id);
  }
  return undefined;
}
