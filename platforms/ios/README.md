# Tcall iOS — haqiqiy native (SwiftUI)

**WebView yo‘q.** Capacitor arxivi: `legacy/ios-capacitor/`

## Talablar

- macOS + Xcode 15+
- Apple Developer account (qurilma testi uchun)

## Xcode loyihasini yaratish

1. Xcode → **File → New → Project → iOS App**
2. Product Name: `Tcall`, Interface: **SwiftUI**, Language: **Swift**
3. `platforms/ios/Tcall/` ichidagi fayllarni loyihaga nusxalang
4. **Signing & Capabilities** → Team tanlang

## Versiya

`Tcall/Version.plist` — `node scripts/version-sync.mjs` bilan yangilanadi.

## API

- Base URL: `https://api.tcall.uz`
- Header: `X-Tcall-Native: 1`
- Auth: `Authorization: Bearer <token>`

## Keyingi bosqichlar

- [ ] Chat (SwiftUI + URLSession + Socket.IO)
- [ ] Qo‘ng‘iroq (WebRTC iOS)
- [ ] Push (APNs)
