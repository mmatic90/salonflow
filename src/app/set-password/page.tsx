"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Locale = "hr" | "en" | "it";

function browserLocale(): Locale {
  if (typeof navigator === "undefined") return "hr";
  const value = navigator.language.toLowerCase();
  if (value.startsWith("it")) return "it";
  if (value.startsWith("en")) return "en";
  return "hr";
}

function browserInviteError() {
  if (typeof window === "undefined") return false;
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return Boolean(hash.get("error") || hash.get("error_code"));
}

const subscribeToBrowserSnapshot = () => () => {};
const getServerLocale = (): Locale => "hr";
const getServerInviteError = () => false;

function copy(locale: Locale) {
  if (locale === "it") {
    return {
      eyebrow: "Attivazione SalonFlow",
      title: "Imposta la tua password",
      description: "Completa l'attivazione del tuo spazio privato SalonFlow.",
      password: "Nuova password",
      confirm: "Ripeti la password",
      button: "Salva e apri SalonFlow",
      checking: "Verifica dell'invito...",
      invalid: "Questo invito non è più valido o è scaduto.",
      invalidHelp: "Chiedi al team SalonFlow un nuovo invito.",
      mismatch: "Le password non coincidono.",
      short: "La password deve contenere almeno 8 caratteri.",
      success: "Password impostata. Apertura di SalonFlow...",
      login: "Vai al login",
    };
  }
  if (locale === "en") {
    return {
      eyebrow: "SalonFlow activation",
      title: "Set your password",
      description: "Complete activation of your private SalonFlow workspace.",
      password: "New password",
      confirm: "Repeat password",
      button: "Save and open SalonFlow",
      checking: "Checking your invitation...",
      invalid: "This invitation is no longer valid or has expired.",
      invalidHelp: "Ask the SalonFlow team for a new invitation.",
      mismatch: "Passwords do not match.",
      short: "Password must be at least 8 characters long.",
      success: "Password saved. Opening SalonFlow...",
      login: "Go to login",
    };
  }
  return {
    eyebrow: "SalonFlow aktivacija",
    title: "Postavi svoju lozinku",
    description: "Dovrši aktivaciju svog privatnog SalonFlow prostora.",
    password: "Nova lozinka",
    confirm: "Ponovi lozinku",
    button: "Spremi i otvori SalonFlow",
    checking: "Provjeravam pozivnicu...",
    invalid: "Ova pozivnica više nije važeća ili je istekla.",
    invalidHelp: "Zatraži novu pozivnicu od SalonFlow tima.",
    mismatch: "Lozinke se ne podudaraju.",
    short: "Lozinka mora imati najmanje 8 znakova.",
    success: "Lozinka je spremljena. Otvaram SalonFlow...",
    login: "Idi na prijavu",
  };
}

export default function SetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const locale = useSyncExternalStore(
    subscribeToBrowserSnapshot,
    browserLocale,
    getServerLocale,
  );
  const inviteError = useSyncExternalStore(
    subscribeToBrowserSnapshot,
    browserInviteError,
    getServerInviteError,
  );
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const text = copy(locale);
  const isReady = inviteError || ready;
  const canSetPassword = !inviteError && hasSession;

  useEffect(() => {
    if (inviteError) return;

    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setHasSession(Boolean(data.session));
      setReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (session) {
        setHasSession(true);
        setReady(true);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [inviteError, supabase]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(text.short);
      return;
    }
    if (password !== confirmPassword) {
      setError(text.mismatch);
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setSaved(true);
    setSaving(false);
    window.history.replaceState(null, "", "/set-password");
    window.setTimeout(() => router.replace("/dashboard"), 700);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-100 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-950 text-white">
          <KeyRound className="h-5 w-5" />
        </div>
        <div className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">
          {text.eyebrow}
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-950">{text.title}</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">{text.description}</p>

        {!isReady ? (
          <div className="mt-7 flex items-center gap-2 rounded-2xl bg-stone-50 p-4 text-sm text-stone-600">
            <Loader2 className="h-4 w-4 animate-spin" /> {text.checking}
          </div>
        ) : !canSetPassword ? (
          <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <div className="font-semibold">{text.invalid}</div>
            <div className="mt-1 text-amber-800">{text.invalidHelp}</div>
            <Link
              href="/login"
              className="mt-4 inline-flex rounded-lg bg-amber-950 px-3 py-2 font-semibold text-white"
            >
              {text.login}
            </Link>
          </div>
        ) : saved ? (
          <div className="mt-7 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
            <CheckCircle2 className="h-5 w-5" /> {text.success}
          </div>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-stone-800">{text.password}</span>
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none transition focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-stone-800">{text.confirm}</span>
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none transition focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
              />
            </label>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-stone-800 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {text.button}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
