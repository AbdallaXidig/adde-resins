"use server";
import type { InquiryStatus, WorkflowStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit, requirePermission } from "@/lib/auth";
import { INQUIRY_STATUSES, WORKFLOW_STATUSES } from "@/lib/status";
import { updateOrderStatus, updateRfqStatus } from "@/lib/workflows";
import { done, fail, optStr, str } from "@/lib/admin-helpers";

export async function setRfqStatus(f: FormData) {
  const user = await requirePermission("rfqs");
  const id = str(f, "id", 40);
  const status = str(f, "status") as WorkflowStatus;
  if (!WORKFLOW_STATUSES.includes(status)) fail(f, "Invalid status.");
  await updateRfqStatus(id, status, user.id, optStr(f, "note", 1000) ?? undefined);
  await prisma.rfq.update({ where: { id }, data: { adminNotes: optStr(f, "adminNotes") } });
  await audit(user.id, "status", "Rfq", id, { status });
  done(`/admin/rfqs/${id}`, "Quotation request updated");
}

export async function setOrderStatus(f: FormData) {
  const user = await requirePermission("orders");
  const id = str(f, "id", 40);
  const status = str(f, "status") as WorkflowStatus;
  if (!WORKFLOW_STATUSES.includes(status)) fail(f, "Invalid status.");
  await updateOrderStatus(id, status, user.id, optStr(f, "note", 1000) ?? undefined);
  await prisma.order.update({ where: { id }, data: { adminNotes: optStr(f, "adminNotes") } });
  await audit(user.id, "status", "Order", id, { status });
  done(`/admin/orders/${id}`, "Order updated");
}

export async function setInquiryStatus(f: FormData) {
  const user = await requirePermission("inquiries");
  const id = str(f, "id", 40);
  const status = str(f, "status") as InquiryStatus;
  if (!INQUIRY_STATUSES.includes(status)) fail(f, "Invalid status.");
  await prisma.inquiry.update({ where: { id }, data: { status, adminNotes: optStr(f, "adminNotes") } });
  await audit(user.id, "status", "Inquiry", id, { status });
  done(`/admin/inquiries/${id}`, "Inquiry updated");
}

export async function updateCustomer(f: FormData) {
  const user = await requirePermission("customers");
  const id = str(f, "id", 40);
  const name = str(f, "name", 120);
  if (!name) fail(f, "Name is required.");
  await prisma.customer.update({
    where: { id },
    data: { name, company: optStr(f, "company", 160), phone: optStr(f, "phone", 40), country: optStr(f, "country", 80), notes: optStr(f, "notes") },
  });
  await audit(user.id, "update", "Customer", id);
  done(`/admin/customers/${id}`, "Customer saved");
}
