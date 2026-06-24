import Link from "next/link";
import { Phone, Globe, Shield, Zap } from "lucide-react";
import { TcallLogo } from "@/components/TcallLogo";
import { AppCopyright } from "@/components/AppCopyright";

export default function HomePage() {
  return (
    <div className="min-h-screen app-page-enter">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-100/60 via-slate-50 to-white" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl animate-float" />
        <div
          className="absolute bottom-20 right-1/4 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "3s" }}
        />

        <nav className="relative z-10 flex items-center justify-between max-w-6xl mx-auto px-6 py-5">
          <Link href="/" className="touch-manipulation">
            <TcallLogo size="sm" />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-secondary text-sm py-2.5 px-5">
              Kirish
            </Link>
            <Link href="/register" className="btn-primary text-sm py-2.5 px-5">
              Boshlash
            </Link>
          </div>
        </nav>

        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-10 pb-28 sm:pt-16 sm:pb-32">
          <div className="flex flex-col md:flex-row md:items-center md:gap-12 lg:gap-16">
            <div className="shrink-0 flex justify-center md:justify-start mb-10 md:mb-0 md:pt-2">
              <TcallLogo size="splash" layout="horizontal" showTagline />
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 text-sm sm:text-base text-brand-700 mb-6 font-medium">
                <Globe className="w-4 h-4 shrink-0" />
                15+ til — aqlli real-time tarjima
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold leading-[1.15] mb-5 tracking-tight">
                Dunyo bilan{" "}
                <span className="bg-gradient-to-r from-brand-500 to-purple-500 bg-clip-text text-transparent">
                  til chegarasisiz
                </span>{" "}
                gaplashing
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-slate-600 leading-relaxed max-w-xl mx-auto md:mx-0 mb-8">
                9 xonali raqamingiz bilan audio qo&apos;ng&apos;iroq qiling. Matn yoki ovoz
                rejimida real-time tarjima — telefon kabi tez va xavfsiz.
              </p>
              <div className="flex flex-col sm:flex-row items-center md:items-start justify-center md:justify-start gap-3 sm:gap-4">
                <Link href="/register" className="btn-primary text-base sm:text-lg px-8 py-4 w-full sm:w-auto">
                  Bepul boshlash
                </Link>
                <Link href="/login" className="btn-secondary text-base sm:text-lg px-8 py-4 w-full sm:w-auto">
                  Qo&apos;ng&apos;iroqqa qo&apos;shilish
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-20 sm:py-24">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-12 sm:mb-16">
          Nima uchun biz?
        </h2>
        <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
          {[
            {
              icon: Globe,
              title: "Real-time tarjima",
              desc: "Sherik boshqa tilde gapirsa ham, aqlli tarjima qiladi va ovozli eshitasiz.",
            },
            {
              icon: Phone,
              title: "Audio qo'ng'iroq",
              desc: "Yuqori sifatli audio. WebRTC texnologiyasi — telefon kabi tez va xavfsiz ulanish.",
            },
            {
              icon: Shield,
              title: "Shaxsiy va xavfsiz",
              desc: "WebRTC orqali shifrlangan audio. Ma'lumotlaringiz himoyalangan.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="glass rounded-2xl p-6 sm:p-8 hover:shadow-md transition-shadow duration-300"
            >
              <div className="w-12 h-12 bg-brand-600/15 rounded-xl flex items-center justify-center mb-5">
                <f.icon className="w-6 h-6 text-brand-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2.5">{f.title}</h3>
              <p className="text-slate-600 leading-relaxed text-sm sm:text-base">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-20 sm:py-24">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-12 sm:mb-16">
          Qanday ishlaydi?
        </h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { step: "1", title: "Ro'yxatdan o'ting", desc: "O'z tilingizni tanlang" },
            { step: "2", title: "Raqam oling", desc: "9 xonali ID yoki chiroyli raqam" },
            { step: "3", title: "Qo'ng'iroq qiling", desc: "Raqam terish yoki xona havolasi" },
            { step: "4", title: "Tarjima", desc: "AI avtomatik tarjima qiladi" },
          ].map((s) => (
            <div key={s.step} className="text-center">
              <div className="w-14 h-14 bg-brand-600 text-white rounded-2xl flex items-center justify-center text-xl font-bold mx-auto mb-4 shadow-lg shadow-brand-600/20">
                {s.step}
              </div>
              <h3 className="font-semibold text-base sm:text-lg mb-2">{s.title}</h3>
              <p className="text-slate-500 text-sm sm:text-base leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-20 sm:py-24 text-center">
        <div className="glass rounded-3xl p-8 sm:p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-600/10 to-purple-600/10" />
          <div className="relative">
            <Zap className="w-10 h-10 text-brand-600 mx-auto mb-6" />
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">Hoziroq sinab ko&apos;ring</h2>
            <p className="text-slate-600 mb-8 max-w-lg mx-auto text-base sm:text-lg leading-relaxed">
              Ro&apos;yxatdan o&apos;ting, xona yarating va birinchi til chegarasisiz
              qo&apos;ng&apos;iroqingizni boshlang.
            </p>
            <Link href="/register" className="btn-primary inline-block text-base sm:text-lg px-8 py-4">
              Bepul hisob yaratish
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-black/10 py-6 sm:py-8 px-4 safe-bottom">
        <AppCopyright />
      </footer>
    </div>
  );
}
