"use client";

type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
};

export function Toggle({
  checked,
  onChange,
  disabled = false,
  label,
  description,
}: ToggleProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <span className="relative inline-flex shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="peer sr-only"
        />
        <span
          className={`block h-6 w-11 rounded-full transition-colors ${
            checked ? "bg-charcoal" : "bg-accent"
          } ${disabled ? "opacity-50" : ""}`}
          aria-hidden
        />
        <span
          className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-input transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
          aria-hidden
        />
      </span>
      {(label || description) && (
        <span className="flex flex-col gap-0.5">
          {label && (
            <span className="text-sm font-medium text-heading">{label}</span>
          )}
          {description && (
            <span className="text-xs text-muted">{description}</span>
          )}
        </span>
      )}
    </label>
  );
}
