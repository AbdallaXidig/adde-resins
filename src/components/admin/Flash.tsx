import { CheckCircle2, AlertTriangle } from "lucide-react";

export function Flash({ saved, error }: { saved?: string; error?: string }) {
  if (!saved && !error) return null;
  return error ? (
    <p role="alert" className="mb-5 flex items-start gap-2 rounded-lg border border-[#ecb7ba] bg-[#f9e1e2] px-4 py-3 text-sm text-[#86141a]"><AlertTriangle size={17} aria-hidden className="mt-0.5 shrink-0" />{error}</p>
  ) : (
    <p role="status" className="mb-5 flex items-start gap-2 rounded-lg border border-[#b9dcc1] bg-[#e3f1e6] px-4 py-3 text-sm text-[#1d5c2d]"><CheckCircle2 size={17} aria-hidden className="mt-0.5 shrink-0" />{saved}</p>
  );
}

export type FlashParams = Promise<{ saved?: string; error?: string; [k: string]: string | string[] | undefined }>;
