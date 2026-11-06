"use client";
import { Printer } from "lucide-react";

export function PrintButton({ label = "Print / Save as PDF" }: { label?: string }) {
  return <button type="button" onClick={() => window.print()} className="btn btn-primary"><Printer size={18} aria-hidden />{label}</button>;
}
