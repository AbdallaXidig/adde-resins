import type { Prisma } from "@prisma/client";

export type RefPrefix = "RFQ" | "ORD" | "INQ";

export function formatReference(prefix: RefPrefix, year: number, n: number) {
  return `ADI-${prefix}-${year}-${String(n).padStart(5, "0")}`;
}

/** Atomic in the database, so simultaneous submissions can never share a reference. */
export async function nextReference(tx: Prisma.TransactionClient, prefix: RefPrefix): Promise<string> {
  const year = new Date().getUTCFullYear();
  const counter = await tx.referenceCounter.upsert({
    where: { key: `${prefix}-${year}` },
    create: { key: `${prefix}-${year}`, value: 1 },
    update: { value: { increment: 1 } },
  });
  return formatReference(prefix, year, counter.value);
}
