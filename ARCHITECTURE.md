# Tcall — platformalar monorepo

Har bir qurilma turi **alohida papkada**, **WebView yo‘q**, haqiqiy native ilova.

```
Tcall.uz/
├── VERSION                 # 1.000000 (manba: packages/tcall-core/version.json)
├── packages/
│   ├── tcall-core/         # Versiya, API kontrakt — barcha platformalar uchun
│   └── desktop-core/       # Windows + Linux umumiy C# API klient
├── platforms/
│   ├── android/            # Kotlin + Jetpack Compose
│   ├── ios/                # Swift + SwiftUI
│   ├── windows/            # C# + Avalonia (WinUI native render)
│   └── linux/              # C# + Avalonia (Ubuntu, Kali, Debian…)
├── legacy/
│   └── ios-capacitor/      # Eski Capacitor (ishlatilmaydi)
├── src/                    # Server + brauzer (veb-sayt, API)
└── scripts/
    ├── version-bump.mjs    # 1.000001, 1.000002 …
    └── version-sync.mjs    # Barcha platformalarga yozadi
```

## Versiya qoidalari

| Amal | Natija |
|------|--------|
| Har o‘zgarish | `node scripts/version-bump.mjs` → `1.000001` |
| Katta reliz | `node scripts/version-bump.mjs --major` → `2.000000` |
| Sinxronlash | `node scripts/version-sync.mjs` |

## Platformalar

| Papka | Qurilma | Texnologiya |
|-------|---------|-------------|
| `platforms/android` | Telefon (Android) | Kotlin, Compose |
| `platforms/ios` | Telefon (iPhone) | Swift, SwiftUI |
| `platforms/windows` | Windows PC | Avalonia UI |
| `platforms/linux` | Linux PC | Avalonia UI |

## Umumiy o‘zgarishlar

1. `packages/tcall-core/api/endpoints.json` — API yo‘llari
2. `packages/tcall-core/version.json` — versiya
3. `node scripts/version-sync.mjs` — Android, iOS, Windows, Linux, server

## Server (veb)

`src/` + `server.ts` — backend va brauzer uchun sayt.

| Domen | Maqsad |
|-------|--------|
| `tcall.uz` | Landing — ma'lumot, yuklab olish |
| `web.tcall.uz` | Veb-ilova — kirish, dashboard, chat |
| `api.tcall.uz` | API (native va web ilovalar) |

Mobil/desktop ilovalar faqat **API** (`api.tcall.uz`) orqali ulanadi.
