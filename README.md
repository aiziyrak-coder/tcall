# Tcall — Til chegarasisiz Video Qo'ng'iroq Platformasi

Real-time AI tarjima bilan video qo'ng'iroq platformasi. Telefonda gaplashgandek, lekin butun dunyo bilan o'z tilingizda.

## Imkoniyatlar

- **Video qo'ng'iroq** — WebRTC orqali yuqori sifatli 1:1 video chat
- **Real-time tarjima** — AI avtomatik tarjima qiladi, subtitr ko'rsatadi
- **Dunyodagi barcha tillar** — O'zbek, Rus, Ingliz, Turk, Arab va yana 180+ til
- **Ro'yxatdan o'tishda til tanlash** — Tarjima sizning tilingizga keladi
- **Xavfsiz** — JWT autentifikatsiya, shifrlangan sessiyalar

## O'rnatish

```bash
npm install
cp .env.example .env
npm run db:push
npm run dev
```

Brauzerda oching: http://localhost:3000

## Ishlatish

1. **Ro'yxatdan o'ting** — Ism, email, parol va **tilingizni** tanlang
2. **Xona yarating** — Dashboard'dan "Qo'ng'iroq boshlash"
3. **Havolani yuboring** — Sherigingizga xona havolasini yuboring
4. **Gaplashing** — Boshqa tilde gapirsangiz ham, sherigingiz o'z tilida ko'radi

## Tarjima

Platforma 3 bosqichli tarjima tizimidan foydalanadi:
1. Google Translate API (agar `GOOGLE_TRANSLATE_API_KEY` o'rnatilgan bo'lsa)
2. LibreTranslate (bepul fallback)
3. Ichki lug'at (offline demo)

Nutq tanish: brauzer Web Speech API (Chrome tavsiya etiladi).

## Platformalar (native ilovalar)

Har bir qurilma turi alohida papkada, **WebView yo‘q**. Batafsil: [ARCHITECTURE.md](./ARCHITECTURE.md)

| Papka | Qurilma |
|-------|---------|
| `platforms/android` | Android telefon |
| `platforms/ios` | iPhone |
| `platforms/windows` | Windows desktop |
| `platforms/linux` | Linux desktop (Ubuntu, Kali…) |

Versiya: `1.000000` → `node scripts/version-bump.mjs` → `1.000001`

```bash
npm run platform:android   # APK
npm run platform:windows   # .NET 8 kerak
npm run platform:linux
```

## Texnologiyalar

- **Server / veb:** Next.js 14, React, TypeScript
- **Android:** Kotlin, Jetpack Compose, Retrofit
- **iOS:** Swift, SwiftUI
- **Desktop:** C#, Avalonia (.NET 8)
- WebRTC (P2P video)
- Socket.io (signaling + tarjima relay)
- Prisma + SQLite
- Tailwind CSS

## Keyingi qadamlar

- Ko'p kishilik qo'ng'iroq (3+ odam)
- Text-to-Speech (ovozli tarjima)
- Native chat / qo'ng'iroq barcha platformalarda
- Qo'ng'iroq yozuvlari
