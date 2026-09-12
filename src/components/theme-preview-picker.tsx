"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type ThemeValue = "sand" | "rose" | "slate";

type ThemeOption = {
  value: ThemeValue;
  name: string;
  description: string;
  swatches: readonly string[];
};

type Props = {
  themes: readonly ThemeOption[];
  initialTheme: ThemeValue;
};

export default function ThemePreviewPicker({ themes, initialTheme }: Props) {
  const [selectedTheme, setSelectedTheme] = useState<ThemeValue>(initialTheme);
  const originalTheme = useRef<ThemeValue>(initialTheme);
  const selectedThemeRef = useRef<ThemeValue>(initialTheme);
  const savedRef = useRef(false);

  useEffect(() => {
    const input = document.querySelector<HTMLInputElement>(
      'input[name="theme"]',
    );
    const form = input?.closest("form");

    function handleSubmit() {
      savedRef.current = true;
      originalTheme.current = selectedThemeRef.current;
    }

    form?.addEventListener("submit", handleSubmit);

    return () => {
      form?.removeEventListener("submit", handleSubmit);

      if (savedRef.current) return;

      const dashboardRoot = document.querySelector<HTMLElement>("[data-theme]");
      if (dashboardRoot) {
        dashboardRoot.dataset.theme = originalTheme.current;
      }
    };
  }, []);

  function previewTheme(theme: ThemeValue) {
    setSelectedTheme(theme);
    selectedThemeRef.current = theme;

    const dashboardRoot = document.querySelector<HTMLElement>("[data-theme]");
    if (dashboardRoot) {
      dashboardRoot.dataset.theme = theme;
    }
  }

  return (
    <div className="mt-5 grid gap-4 md:grid-cols-3">
      {themes.map((theme) => {
        const active = selectedTheme === theme.value;

        return (
          <label
            key={theme.value}
            className={`relative cursor-pointer rounded-2xl border p-4 transition ${
              active
                ? "border-app-accent ring-2 ring-app-accent/15"
                : "border-app-soft hover:bg-app-bg"
            }`}
          >
            <input
              type="radio"
              name="theme"
              value={theme.value}
              checked={active}
              onChange={() => previewTheme(theme.value)}
              className="sr-only"
            />

            {active ? (
              <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-app-accent text-white">
                <Check className="h-3.5 w-3.5" />
              </span>
            ) : null}

            <div className="flex gap-2">
              {theme.swatches.map((swatch) => (
                <span
                  key={swatch}
                  className="h-8 w-8 rounded-full border border-black/5 shadow-sm"
                  style={{ backgroundColor: swatch }}
                />
              ))}
            </div>

            <h3 className="mt-4 font-bold text-app-text">{theme.name}</h3>
            <p className="mt-1 text-sm leading-5 text-app-muted">
              {theme.description}
            </p>
          </label>
        );
      })}
    </div>
  );
}
