"use client";

type ToggleSwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  ariaLabel: string;
  disabled?: boolean;
  onText?: string;
  offText?: string;
};

export default function ToggleSwitch({
  checked,
  onCheckedChange,
  ariaLabel,
  disabled = false,
  onText = "ON",
  offText = "OFF",
}: ToggleSwitchProps) {
  return (
    <label
      className={`inline-flex shrink-0 items-center gap-2 ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      }`}
    >
      <input
        type="checkbox"
        role="switch"
        className="peer sr-only"
        checked={checked}
        onChange={(event) => onCheckedChange(event.target.checked)}
        disabled={disabled}
        aria-label={ariaLabel}
      />
      <span
        aria-hidden="true"
        className="relative h-7 w-12 rounded-full bg-slate-300 transition-colors after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-app-accent peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-app-accent peer-focus-visible:ring-offset-2"
      />
      <span
        aria-hidden="true"
        className="min-w-7 text-xs font-extrabold tracking-wide text-app-text"
      >
        {checked ? onText : offText}
      </span>
    </label>
  );
}
