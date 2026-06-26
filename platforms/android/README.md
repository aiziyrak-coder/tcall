# Tcall Android — WebView (Play Market)

Professional WebView ilova: **web.tcall.uz** ni yuklaydi. Dizayn va funksiyalar veb bilan bir xil.

## Qurish

```bash
cd platforms/android
./gradlew :app:assembleDebug
```

Nashr (loyiha ildizida):

```bash
npm run publish:android-apk
```

APK: `public/downloads/tcall-android.apk`

## Arxitektura

| Komponent | Vazifa |
|-----------|--------|
| `MainActivity` | WebView shell, progress, offline UI |
| `TcallSessionStore` | EncryptedSharedPreferences — sessiya saqlash |
| `TcallAndroidBridge` | JS ↔ native (auth, push, tashqi havolalar) |
| `TcallWebViewClient` | URL filtri, Custom Tabs, xato/offline |
| `TcallWebChromeClient` | WebRTC ruxsatlari, fayl yuklash |
| `TcallFirebaseMessagingService` | Push bildirishnomalar |

## Sessiya

Login muvaffaqiyatli bo‘lganda token **localStorage** va **native xavfsiz xotira**da saqlanadi. Ilova qayta ochilganda sessiya avtomatik tiklanadi — login flash yo‘q.

## Play Market

- Target SDK 36, min SDK 24
- Release: ProGuard + shrink
- Deep link: `https://tcall.uz/call/*`, `https://web.tcall.uz/*`, `tcall://call/*`
- Tashqi havolalar Chrome Custom Tabs orqali ochiladi
