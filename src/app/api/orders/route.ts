import { after, NextResponse } from "next/server";
import { parsePublic, serverError } from "@/lib/api";
import { syncOrderToSheet } from "@/lib/sheets";
import { orderSchema } from "@/lib/validation";
import { createOrder, OrderProblem } from "@/lib/workflows";

export async function POST(req: Request) {
  const parsed = await parsePublic(req, orderSchema, "order");
  if ("response" in parsed) return parsed.response;
  try {
    const order = await createOrder(parsed.data);
    // Copy to the tracking sheet after the customer already has their answer.
    after(() => syncOrderToSheet(order.id).catch((e) => console.error("Sheet sync failed", e)));
    return NextResponse.json({ reference: order.reference, token: order.accessToken }, { status: 201 });
  } catch (e) {
    if (e instanceof OrderProblem) {
      return NextResponse.json({ problem: { code: e.code, product: e.productName } }, { status: 409 });
    }
    return serverError(e);
  }
}
