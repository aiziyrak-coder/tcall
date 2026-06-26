# Firebase / FCM — Tcall Android

## Tayyor (avtomatik sozlangan)

| Parametr | Qiymat |
|----------|--------|
| Firebase loyiha | `tcall-28118` |
| Android package | `uz.tcall` |
| Konfig fayl | `platforms/android/app/google-services.json` |

Siz hech narsa qo‘lda qilmadingiz — CLI orqali yaratildi.

## APK yig‘ish

```bash
cd platforms/android
gradlew.bat :app:assembleDebug
```

Telefonga o‘rnating va ilovaga kiring — bildirishnoma ruxsatini bering.

## Serverdan push (kiruvchi qo‘ng‘iroq/xabar)

Server `.env` da **FCM_SERVICE_ACCOUNT** kerak (bir marta):

1. [Firebase Console](https://console.firebase.google.com/project/tcall-28118/settings/serviceaccounts/adminsdk) → **Service accounts**
2. **Generate new private key** → JSON yuklab oling
3. Serverda `/var/www/tcall/.env` ga qo‘shing:

```
FCM_SERVICE_ACCOUNT='{"type":"service_account","project_id":"tcall-28118",...}'
```

(yoki JSON ni base64 qilib yozing)

4. `pm2 restart tcall`

## Tekshirish

Ilova ochilganda Logcat da: `TcallPush: FCM token registered`
