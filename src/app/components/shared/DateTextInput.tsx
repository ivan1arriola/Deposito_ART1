"use client";

import { normalizeDateInput } from "@/lib/date-helpers";

type DateTextInputProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  ariaLabel?: string;
};

export function DateTextInput({
  value,
  onChange,
  className,
  disabled,
  placeholder = "DD/MM/AAAA",
  maxLength = 10,
  ariaLabel,
}: DateTextInputProps) {
  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder={placeholder}
      maxLength={maxLength}
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(event) => onChange(normalizeDateInput(event.target.value))}
      className={className}
    />
  );
}
