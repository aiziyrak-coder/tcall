# Tcall — Mobil ilova (Android & iOS)

Tcall endi **Capacitor** native ilova sifatida ishlaydi. Ilova **local emas** — to'g'ridan-to'g'ri production serverga ulanadi:

**https://tcall.vizara.uz**

Audio qo'ng'iroq, tarjima, chat va barcha funksiyalar server orqali ishlaydi.

---

## Talablar

### Android (Android Studio)
- [Android Studio](https://developer.android.com/studio) (Ladybug yoki yangiroq)
- JDK 17+ (Android Studio bilan keladi)
- Android SDK 36
- USB orqali ulangan Android telefon **yoki** emulyator

### iOS (faqat Mac)
- Xcode 15+
- Apple Developer akkaunt (real qurilmada test uchun)

---

## 1. Loyihani tayyorlash

```bash
cd E:\Tcall.uz
npm install
npx cap sync
```

---

## 2. Android Studio orqali telefonga o'rnatish

### Qadam 1 — Android Studio ochish

```bash
npm run mobile:android
```

Yoki: Android Studio → **Open** → `E:\Tcall.uz\android` papkasini tanlang.

### Qadam 2 — Gradle sync

Android Studio ochilgach yuqorida **Sync Project with Gradle Files** tugmasini bosing. Birinchi marta 5–15 daqiqa davom etishi mumkin.

### Qadam 3 — Telefonni ulash

1. Android telefonda: **Sozlamalar → Telefon haqida → Build number** (7 marta bosing → Developer mode)
2. **Sozlamalar → Developer options → USB debugging** yoqing
3. USB kabel bilan kompyuterga ulang
4. Telefonda "USB debugging ruxsat berilsinmi?" → **Ruxsat berish**

Android Studio yuqori panelda qurilmangiz nomi ko'rinishi kerak (masalan `Samsung SM-G991B`).

### Qadam 4 — Ilovani ishga tushirish

1. Yuqoridagi qurilma ro'yxatidan telefoningizni tanlang
2. Yashil **Run ▶** tugmasini bosing (yoki `Shift+F10`)
3. Birinchi o'rnatish 2–5 daqiqa davom etishi mumkin
4. Telefonda **Tcall** ilovasi paydo bo'ladi

### Qadam 5 — Ruxsatlar

Ilova ochilganda quyidagilarni ruxsat bering:

| Ruxsat | Nima uchun |
|--------|------------|
| **Mikrofon** | Audio qo'ng'iroq va tarjima |
| **Bildirishnomalar** | Kiruvchi qo'ng'iroq (dialer kabi) |

---

## 3. APK fayl yaratish (telefonga qo'lda o'rnatish)

Android Studio:

1. **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. Tayyor bo'lgach: **locate** tugmasi
3. Fayl: `android/app/build/outputs/apk/debug/app-debug.apk`
4. APK ni telefonga yuboring (Telegram, USB) va oching
5. "Noma'lum manbalardan o'rnatish" ruxsatini bering

---

## 4. Kiruvchi qo'ng'iroq (dialer rejimi)

| Holat | Qanday ishlaydi |
|-------|-----------------|
| Ilova ochiq | To'liq ekran incoming call UI + jiringlash |
| Ilova background | Native bildirishnoma (Local Notifications) |
| Ilova yopiq | Firebase Push (FCM) — quyida sozlash |

---

## 5. Firebase Push (ilova yopiq bo'lganda chaqiruv)

Background/killed holatda push kerak bo'lsa:

1. [Firebase Console](https://console.firebase.google.com) → yangi loyiha
2. Android app qo'shing: package name **`uz.vizara.tcall`**
3. `google-services.json` yuklab oling
4. Faylni joylang: `android/app/google-services.json`
5. Firebase → Project Settings → Cloud Messaging → **Server key** ni oling
6. Server `.env` ga qo'shing:
   ```
   FCM_SERVER_KEY=your_server_key_here
   ```
7. Qayta deploy: `node deploy/quick-restart.mjs`
8. Android Studio da qayta **Run**

---

## 6. iOS (Mac kerak)

```bash
npm run mobile:ios
```

Xcode ochiladi → iPhone tanlang → **Run ▶**

Info.plist da mikrofon va bildirishnomalar ruxsati allaqachon qo'shilgan.

---

## 7. O'zgarishlardan keyin sync

Native konfiguratsiya yoki plugin o'zgarganda:

```bash
npx cap sync
```

Keyin Android Studio da qayta **Run**.

---

## 8. Muammolar

### "Gradle sync failed"
- Android Studio → SDK Manager → Android 14/15 SDK o'rnatilganini tekshiring
- **File → Invalidate Caches → Restart**

### Mikrofon ishlamaydi
- Telefon sozlamalarida Tcall uchun mikrofon ruxsatini tekshiring
- Ilovani to'liq yoping va qayta oching

### Kiruvchi qo'ng'iroq kelmaydi (ilova yopiq)
- `FCM_SERVER_KEY` serverda sozlanganini tekshiring
- `google-services.json` `android/app/` da borligini tekshiring
- Bildirishnomalar ruxsati berilganini tekshiring

### Internet / login ishlamaydi
- Telefon internetga ulanganini tekshiring
- Brauzerda https://tcall.vizara.uz ochilishini tekshiring

---

## Texnik ma'lumot

| Parametr | Qiymat |
|----------|--------|
| App ID | `uz.vizara.tcall` |
| Server | `https://tcall.vizara.uz` |
| Min Android | API 24 (Android 7.0) |
| Framework | Capacitor 8 |

Ilova WebView ichida production saytni yuklaydi — alohida local server kerak emas.
