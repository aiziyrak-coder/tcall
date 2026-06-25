import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="max-w-3xl mx-auto px-5 py-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-brand-600 text-sm font-medium mb-6">
          <ArrowLeft className="w-4 h-4" /> Tcall
        </Link>

        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-400 mt-1">{updated}</p>

        <article className="legal-content mt-8 space-y-5 leading-relaxed text-[15px]">{children}</article>

        <footer className="mt-12 pt-6 border-t border-slate-200 text-sm text-slate-500 flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/privacy" className="hover:text-brand-600">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-brand-600">Terms of Service</Link>
          <a href="mailto:support@tcall.uz" className="hover:text-brand-600">support@tcall.uz</a>
          <span className="ml-auto">© {new Date().getFullYear()} Tcall</span>
        </footer>
      </div>
    </div>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-900 mb-1.5">{heading}</h2>
      <div className="space-y-2 text-slate-600">{children}</div>
    </section>
  );
}
