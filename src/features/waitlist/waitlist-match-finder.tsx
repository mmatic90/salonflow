"use client";

type Props = {
  entryId: string;
  clientId: string;
  serviceId: string;
  locale: "hr" | "en" | "it";
};

// Waitlist matching is automatic now. Keep this compatibility component temporarily so
// the waitlist page can be simplified without leaving the old manual search visible.
export default function WaitlistMatchFinder(props: Props) {
  void props;
  return null;
}
