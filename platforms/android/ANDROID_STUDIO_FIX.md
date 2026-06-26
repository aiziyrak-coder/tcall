## Android Studio — tez yordam

### Qaysi papkani ochish?

**Faqat bitta joy:** `E:\Tcall.uz\platforms\android`

Ildizdagi `android/` papka yo‘q — hamma narsa shu yerda.

1. Android Studio → **File → Open**
2. `E:\Tcall.uz\platforms\android` ni tanlang
3. **Gradle JDK** → JDK 17 yoki 21
4. **Sync Project with Gradle Files**

### APK yig‘ish

```bash
cd E:\Tcall.uz\platforms\android
gradlew.bat :app:assembleDebug
```

APK: `platforms/android/app/build/outputs/apk/debug/app-debug.apk`

### Gradle sync xatosi

Terminalda sinab ko‘ring — xato matni aniqroq chiqadi:

```bash
cd platforms\android
gradlew.bat :app:assembleDebug
```
