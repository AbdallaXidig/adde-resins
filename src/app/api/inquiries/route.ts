import { NextResponse } from "next/server";
import { parsePublic, serverError } from "@/lib/api";
import { inquirySchema } from "@/lib/validation";
import { createInquiry } from "@/lib/workflows";

export async function POST(req: Request) {
  const parsed = await parsePublic(req, inquirySchema, "inquiry");
  if ("response" in parsed) return parsed.response;
  try {
    const inquiry = await createInquiry(parsed.data);
    return NextResponse.json({ reference: inquiry.reference }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}
