"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { scrollInputIntoView } from "@/hooks/useAuthKeyboard";

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: ReactNode;
  hint?: ReactNode;
  fieldClassName?: string;
}

export function AuthField({
  label,
  hint,
  fieldClassName = "",
  className = "",
  id,
  onFocus,
  ...props
}: AuthFieldProps) {
  const inputId = id || props.name;

  return (
    <div className={fieldClassName}>
      <label htmlFor={inputId} className="block text-sm text-slate-600 mb-2">
        {label}
      </label>
      <input
        {...props}
        id={inputId}
        className={`input-field auth-input ${className}`}
        onFocus={(e) => {
          scrollInputIntoView(e.currentTarget);
          onFocus?.(e);
        }}
      />
      {hint}
    </div>
  );
}
