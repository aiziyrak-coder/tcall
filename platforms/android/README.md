# Tcall Android — Play Market WebView

Professional WebView ilova: **https://web.tcall.uz**

## Qurish

```bash
cd platforms/android
./gradlew :app:assembleDebug
```

Loyiha ildizida: `npm run publish:android-apk`

## Imkoniyatlar

- To'liq web.tcall.uz (login, chat, qo'ng'iroq, sozlamalar, to'lov)
- Native sessiya saqlash (qayta ochganda login kerak emas)
- Pull-to-refresh, yuklanish progressi
- WebRTC (mikrofon/kamera), fayl yuklash
- FCM push, deep link
- Tashqi havolalar Chrome Custom Tabs
- Release: ProGuard + shrink

## Firebase

`app/google-services.json` qo'ying (`.gitignore` da). Namuna: `google-services.json.example`
