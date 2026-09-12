"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getDictionary, type AppLocale } from "@/lib/i18n";

function detectLocale(): AppLocale {
  if (typeof navigator === "undefined") return "hr";
  const language = navigator.language.toLowerCase();
  if (language.startsWith("it")) return "it";
  if (language.startsWith("en")) return "en";
  return "hr";
}

export default function LoginPage() {
  const supabase = createClient();
  const [locale, setLocale] = useState<AppLocale>("hr");
  const t = getDictionary(locale).auth;

  useEffect(() => {
    setLocale(detectLocale());
  }, []);
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      setErrorMessage(t.invalidCredentials);
      setLoading(false);
      return;
    }

    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", data.user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      setErrorMessage(t.salonCheckError);
      setLoading(false);
      return;
    }

    router.push(membership ? "/dashboard" : "/onboarding");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-app-bg px-4">
      <div className="w-full max-w-md rounded-2xl border border-app-soft bg-app-card p-8 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-app-text">{t.loginTitle}</h1>
          <p className="mt-2 text-sm text-app-muted">
            {t.loginDescription}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-app-text">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="w-full rounded-xl border border-app-soft bg-white px-4 py-3 text-app-text outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-app-text">
              Lozinka
            </label>
            <input
              id="password"
              type="password"
              className="w-full rounded-xl border border-app-soft bg-white px-4 py-3 text-app-text outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {errorMessage ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-app-accent px-4 py-3 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? t.signingIn : t.signIn}
          </button>
        </form>
      </div>
    </main>
  );
}
