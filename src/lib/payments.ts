// Online payment is deliberately not implemented. Checkout saves the order and staff follow up
// with an invoice. To add a provider later, implement PaymentProvider and register it below.
export interface PaymentProvider {
  id: string;
  createPayment(input: { orderReference: string; amount: number; currency: string }): Promise<{ redirectUrl: string }>;
}

const providers: Record<string, PaymentProvider> = {};

export function activePaymentProvider(): PaymentProvider | null {
  const id = process.env.PAYMENT_PROVIDER ?? "none";
  return id === "none" ? null : (providers[id] ?? null);
}
