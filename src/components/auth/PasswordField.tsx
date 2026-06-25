"use client";

import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { scrollInputIntoView } from "@/hooks/useAuthKeyboard";

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
  hint?: ReactNode;
  showToggleLabel?: string;
  hideToggleLabel?: string;
}

export function PasswordField({
  label,
  hint,
  showToggleLabel = "Parolni ko'rsatish",
  hideToggleLabel = "Parolni yashirish",
  className = "",
  id,
  onFocus,
  ...props
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const inputId = id || props.name || "password";

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm text-slate-600 mb-2">
        {label}
      </label>
      <div className="auth-input-wrap">
        <input
          {...props}
          id={inputId}
          type={visible ? "text" : "password"}
          className={`input-field auth-input auth-input-password ${className}`}
          onFocus={(e) => {
            scrollInputIntoView(e.currentTarget);
            onFocus?.(e);
          }}
        />
        <button
          type="button"
          className="auth-input-toggle"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? hideToggleLabel : showToggleLabel}
          tabIndex={-1}
        >
          {visible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
      {hint}
    </div>
  );
}
