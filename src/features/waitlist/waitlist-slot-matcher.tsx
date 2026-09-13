"use client";

type Option = { id: string; label: string };

type Props = {
  locale: "hr" | "en" | "it";
  services: Option[];
  defaultDate: string;
};

// Freed slots are matched automatically and surfaced on the dashboard.
// This compatibility component intentionally renders nothing while the surrounding
// waitlist page keeps its stable structure.
export default function WaitlistSlotMatcher(props: Props) {
  void props;
  return null;
}
