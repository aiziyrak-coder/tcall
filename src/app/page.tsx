import Link from "next/link";
import { Phone, Globe, Shield, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900/50 via-slate-950 to-slate-950" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl animate-float" style={{ animationDelay: "3s" }} />

        <nav className="relative z-10 flex items-center justify-between max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
              <Phone className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold">Tcall</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-secondary text-sm py-2 px-4">
              Kirish
            </Link>
            <Link href="/register" className="btn-primary text-sm py-2 px-4">
              Boshlash
            </Link>
          </div>
        </nav>

        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-16 pb-32 text-center">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-sm text-brand-300 mb-8">
            <Globe className="w-4 h-4" />
            15+ til — aqlli real-time tarjima
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold leading-tight mb-6">
            Dunyo bilan{" "}
            <span className="bg-gradient-to-r from-brand-400 to-purple-400 bg-clip-text text-transparent">
              til chegarasisiz
            </span>{" "}
            gaplashing
          </h1>
          <p className="text-base sm:text-xl text-white/60 max-w-2xl mx-auto mb-10 px-2">
            Audio qo&apos;ng&apos;iroq qiling — 9 xonali raqamingiz bilan dunyo bilan gaplashing.
            Real-time tarjima: matn yoki ovoz rejimida.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="btn-primary text-lg px-8 py-4">
              Bepul boshlash
            </Link>
            <Link href="/login" className="btn-secondary text-lg px-8 py-4">
              Qo&apos;ng&apos;iroqqa qo&apos;shilish
            </Link>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-center mb-16">Nima uchun Tcall?</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Globe,
              title: "Real-time tarjima",
              desc: "Sherik boshqa tilde gapirsa ham, aqlli tarjima qiladi va ovozli eshitasiz.",
            },
            {
              icon: Phone,
              title: "Video qo'ng'iroq",
              desc: "Yuqori sifatli video va audio. WebRTC texnologiyasi — tez va xavfsiz ulanish.",
            },
            {
              icon: Shield,
              title: "Shaxsiy va xavfsiz",
              desc: "WebRTC orqali shifrlangan video va audio. Ma'lumotlaringiz himoyalangan.",
            },
          ].map((f) => (
            <div key={f.title} className="glass rounded-2xl p-8 hover:bg-white/10 transition-colors">
              <div className="w-12 h-12 bg-brand-600/20 rounded-xl flex items-center justify-center mb-5">
                <f.icon className="w-6 h-6 text-brand-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{f.title}</h3>
              <p className="text-white/60 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-center mb-16">Qanday ishlaydi?</h2>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { step: "1", title: "Ro'yxatdan o'ting", desc: "O'z tilingizni tanlang" },
            { step: "2", title: "Xona yarating", desc: "Havolani sherigingizga yuboring" },
            { step: "3", title: "Video qo'ng'iroq", desc: "Telefonda gaplashgandek suhbat qiling" },
            { step: "4", title: "Tarjima", desc: "AI avtomatik tarjima qiladi" },
          ].map((s) => (
            <div key={s.step} className="text-center">
              <div className="w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center text-xl font-bold mx-auto mb-4">
                {s.step}
              </div>
              <h3 className="font-semibold mb-2">{s.title}</h3>
              <p className="text-white/50 text-sm">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <div className="glass rounded-3xl p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-600/10 to-purple-600/10" />
          <div className="relative">
            <Zap className="w-10 h-10 text-brand-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">Hoziroq sinab ko&apos;ring</h2>
            <p className="text-white/60 mb-8 max-w-lg mx-auto">
              Ro&apos;yxatdan o&apos;ting, xona yarating va birinchi til chegarasisiz qo&apos;ng&apos;iroqingizni boshlang.
            </p>
            <Link href="/register" className="btn-primary inline-block">
              Bepul hisob yaratish
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-white/40 text-sm">
        <p>&copy; 2026 Tcall.uz — Til chegarasisiz aloqa</p>
      </footer>
    </div>
  );
}
