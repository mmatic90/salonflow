"use client";

import { useSyncExternalStore } from "react";

const COOKIE_KEY = "bodyandsoul_cookie_consent";
const COOKIE_CHANGE_EVENT = "salonflow-cookie-consent-change";

type ConsentSnapshot = "loading" | "accepted" | "rejected" | null;

function getConsentSnapshot(): ConsentSnapshot {
  const saved = window.localStorage.getItem(COOKIE_KEY);
  return saved === "accepted" || saved === "rejected" ? saved : null;
}

function getConsentServerSnapshot(): ConsentSnapshot {
  return "loading";
}

function subscribeToConsent(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(COOKIE_CHANGE_EVENT, listener);

  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(COOKIE_CHANGE_EVENT, listener);
  };
}

function saveConsent(value: "accepted" | "rejected") {
  window.localStorage.setItem(COOKIE_KEY, value);
  window.dispatchEvent(new Event(COOKIE_CHANGE_EVENT));
}

export default function CookieConsent() {
  const consent = useSyncExternalStore(
    subscribeToConsent,
    getConsentSnapshot,
    getConsentServerSnapshot,
  );

  function acceptCookies() {
    saveConsent("accepted");
  }

  function rejectCookies() {
    saveConsent("rejected");
  }

  if (consent !== null) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-3xl rounded-2xl border border-[#eadbd2] bg-white p-5 shadow-2xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-semibold text-[#2f2723]">Kolačići</h2>
          <p className="mt-1 text-sm leading-6 text-[#6f5a50]">
            Ova stranica koristi osnovne kolačiće za ispravan rad stranice i
            poboljšanje korisničkog iskustva. Trenutno ne koristimo marketinške
            kolačiće.
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={rejectCookies}
            className="rounded-xl border border-[#eadbd2] px-4 py-2 text-sm font-semibold text-[#2f2723]"
          >
            Odbij
          </button>

          <button
            type="button"
            onClick={acceptCookies}
            className="rounded-xl bg-[#2f2723] px-4 py-2 text-sm font-semibold text-white"
          >
            Prihvati
          </button>
        </div>
      </div>
    </div>
  );
}
