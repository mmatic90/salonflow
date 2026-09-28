export const billingProviders = ["manual", "stripe"] as const;
export type BillingProvider = (typeof billingProviders)[number];

export function normalizeBillingProvider(value: unknown): BillingProvider {
  return value === "stripe" ? "stripe" : "manual";
}

export function billingProviderLabel(provider: BillingProvider) {
  return provider === "stripe" ? "Stripe" : "Manualno";
}

export function isStripeBillingConnected(args: {
  provider: BillingProvider;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}) {
  return (
    args.provider === "stripe" &&
    Boolean(args.stripeCustomerId) &&
    Boolean(args.stripeSubscriptionId)
  );
}
