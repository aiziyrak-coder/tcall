# Tcall — haqiqiy native Android ilova

Bu loyiha endi **Capacitor / WebView emas**. `platforms/android/app` — to‘liq **Kotlin + Jetpack Compose** native ilova.

## Arxitektura

| Qatlam | Texnologiya |
|--------|-------------|
| UI | Jetpack Compose, Material 3 |
| Tarmoq | OkHttp + Retrofit |
| Auth | JWT (`Bearer` + `EncryptedSharedPreferences`) |
| API | `https://api.tcall.uz` |
| Keyingi bosqich | WebRTC (Google), Socket.IO Java, FCM |

## Qurish

1. Android Studio (Ladybug yoki yangiroq) oching
2. `platforms/android/` papkasini oching
3. **Build → Build APK** yoki Run

```bash
cd platforms/android
./gradlew :app:assembleDebug
```

## Capacitor olib tashlandi

- `capacitor.config.ts` faqat tarixiy — mobil endi WebView yuklamaydi
- `npm run mobile:sync` kerak emas
- Production server (`tcall.uz`) brauzer va API uchun qoladi

## Migratsiya rejasi

- [x] Native shell: login, sessiya, 5 tab navigatsiya
- [x] Chat (Compose + REST + Socket.IO)
- [x] Qo'ng'iroq (WebRTC native + Socket signaling)
- [x] Push (FCM — `google-services.json` kerak)
- [x] Tarjima / interpreter (mikrofon → API → TTS)
