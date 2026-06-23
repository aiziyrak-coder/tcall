"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export interface User {
  userId: string;
  email: string;
  name: string;
  language: string;
  tcallId: string;
  translationMode: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/auth/session")
      .then((r) => {
        if (!r.ok) throw new Error("Session yuklanmadi");
        return r.json();
      })
      .then((d) => setUser(d.user))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    await apiFetch("/api/auth/session", { method: "DELETE" });
    setUser(null);
    window.location.href = "/";
  };

  return { user, loading, error, logout, setUser };
}
