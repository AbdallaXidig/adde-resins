import { after, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { parsePublic, serverError } from "@/lib/api";
import { syncRfqToSheet } from "@/lib/sheets";
import { rfqSchema } from "@/lib/validation";
import { createRfq } from "@/lib/workflows";

export async function POST(req: Request) {
  const parsed = await parsePublic(req, rfqSchema, "rfq");
  if ("response" in parsed) return parsed.response;
  try {
    const rfq = await createRfq(parsed.data);
    revalidatePath("/admin", "layout");
    after(() => syncRfqToSheet(rfq.id).catch((e) => console.error("Sheet sync failed", e)));
    return NextResponse.json({ reference: rfq.reference }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}
