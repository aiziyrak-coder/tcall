# Tcall Android — haqiqiy native (Kotlin + Compose)

**WebView yo‘q.** Capacitor arxivi ishlatilmaydi.

Batafsil: [NATIVE_ANDROID.md](./NATIVE_ANDROID.md)

## Talablar

- Android Studio Ladybug yoki yangiroq
- JDK 17

## Qurish

```bash
cd platforms/android
./gradlew :app:assembleDebug
```

APK: `platforms/android/app/build/outputs/apk/debug/app-debug.apk`

## Versiya

`node scripts/version-sync.mjs` — `versionName` va `versionCode` yangilanadi.

## Imkoniyatlar (native)

| Modul | Holat |
|-------|--------|
| Login / sessiya | ✅ |
| Chat (REST + Socket.IO real-time) | ✅ |
| Qo'ng'iroq (WebRTC + signaling) | ✅ |
| Jonli tarjimon (mikrofon → API → TTS) | ✅ |
| Push (FCM) | ✅ (`google-services.json` kerak) |
| Do'stlar ro'yxati | Tez orada |

## FCM sozlash

**Tayyor** — `platforms/android/app/google-services.json` mavjud (loyiha: `tcall-28118`, package: `uz.tcall`).

Batafsil: [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)

Agar fayl yo‘qolsa:
```bash
firebase apps:sdkconfig ANDROID 1:745149350790:android:2db37ef44a22d195206207 --project tcall-28118 -o platforms/android/app/google-services.json
```
