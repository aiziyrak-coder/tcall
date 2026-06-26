# Tcall Android — WebView (web.tcall.uz)

Android ilova **web.tcall.uz** ni to‘liq WebView ichida ochadi — dizayn va funksiyalar veb bilan **bir xil**.

## Qurish

```bash
cd platforms/android
./gradlew :app:assembleDebug
```

APK: `platforms/android/app/build/outputs/apk/debug/app-debug.apk`

Nashr: `npm run publish:android-apk` (loyiha ildizida)

## Imkoniyatlar

| Funksiya | Holat |
|----------|--------|
| Login / dashboard / chat / qo‘ng‘iroq | ✅ veb bilan bir xil |
| Sozlamalar / obuna / Cryptomus | ✅ veb bilan bir xil |
| WebRTC (mikrofon/kamera) | ✅ WebView ruxsatlari |
| Push (FCM) | ✅ |
| Deep link `/call/ROOM` | ✅ |

## Texnik

- `MainActivity` → `https://web.tcall.uz/dashboard`
- `TcallAndroidBridge` — native push ro‘yxatdan o‘tish
- Eski native Compose kod arxivda (`app/src/main/kotlin/uz/tcall/ui/`)
