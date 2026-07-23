"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function OnboardingPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [salonName, setSalonName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function checkAccess() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (membership) {
        router.replace("/dashboard");
        return;
      }

      setChecking(false);
    }

    void checkAccess();
  }, [router, supabase]);

  function handleSalonNameChange(value: string) {
    setSalonName(value);
    if (!slugEdited) {
      setSlug(slugify(value));
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");

    const normalizedName = salonName.trim();
    const normalizedSlug = slugify(slug);

    if (normalizedName.length < 2 || normalizedSlug.length < 2) {
      setErrorMessage("Unesite naziv salona i valjanu oznaku salona.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.rpc("create_organization_with_owner", {
      organization_name: normalizedName,
      organization_slug: normalizedSlug,
    });

    if (error) {
      setErrorMessage(
        error.code === "23505"
          ? "Ova oznaka salona već postoji. Odaberite drugu."
          : "Salon nije moguće stvoriti. Pokušajte ponovno."
      );
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-app-bg px-4">
        <p className="text-sm text-app-muted">Provjera korisničkog računa...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-app-bg px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-app-soft bg-app-card p-8 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-semibold text-app-accent">Dobro došli u SalonFlow</p>
          <h1 className="mt-2 text-3xl font-bold text-app-text">Postavite svoj prvi salon</h1>
          <p className="mt-2 text-sm text-app-muted">
            Salon će postati zasebna organizacija, a vi ćete biti njezin vlasnik.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="salon-name" className="mb-1 block text-sm font-medium text-app-text">
              Naziv salona
            </label>
            <input
              id="salon-name"
              value={salonName}
              onChange={(event) => handleSalonNameChange(event.target.value)}
              placeholder="Primjer: Studio Aurora"
              className="w-full rounded-xl border border-app-soft bg-white px-4 py-3 text-app-text outline-none"
              required
            />
          </div>

          <div>
            <label htmlFor="salon-slug" className="mb-1 block text-sm font-medium text-app-text">
              Oznaka salona
            </label>
            <input
              id="salon-slug"
              value={slug}
              onChange={(event) => {
                setSlugEdited(true);
                setSlug(slugify(event.target.value));
              }}
              placeholder="studio-aurora"
              className="w-full rounded-xl border border-app-soft bg-white px-4 py-3 text-app-text outline-none"
              required
            />
            <p className="mt-1 text-xs text-app-muted">
              Koristit će se kao jedinstvena tehnička oznaka salona.
            </p>
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
            {loading ? "Stvaranje salona..." : "Stvori salon"}
          </button>
        </form>
      </div>
    </main>
  );
}
