import type { InquiryStatus, WorkflowStatus } from "@prisma/client";

export const WORKFLOW_STATUSES: WorkflowStatus[] = [
  "PENDING", "UNDER_REVIEW", "QUOTATION_SENT", "CONFIRMED", "PROCESSING",
  "READY_FOR_SHIPMENT", "SHIPPED", "DELIVERED", "CANCELLED",
];

export const STATUS_LABELS: Record<WorkflowStatus, string> = {
  PENDING: "Pending",
  UNDER_REVIEW: "Under Review",
  QUOTATION_SENT: "Quotation Sent",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  READY_FOR_SHIPMENT: "Ready for Shipment",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const INQUIRY_STATUSES: InquiryStatus[] = ["NEW", "IN_PROGRESS", "RESOLVED", "ARCHIVED"];
export const INQUIRY_LABELS: Record<InquiryStatus, string> = {
  NEW: "New",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  ARCHIVED: "Archived",
};

/** Stock leaves on confirmation, and returns if a confirmed order is later cancelled. */
export function stockAction(toStatus: WorkflowStatus, committed: boolean): "commit" | "release" | null {
  const committing: WorkflowStatus[] = ["CONFIRMED", "PROCESSING", "READY_FOR_SHIPMENT", "SHIPPED", "DELIVERED"];
  if (!committed && committing.includes(toStatus)) return "commit";
  if (committed && (toStatus === "CANCELLED" || toStatus === "PENDING" || toStatus === "UNDER_REVIEW" || toStatus === "QUOTATION_SENT")) return "release";
  return null;
}
