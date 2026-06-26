# Tcall Windows — haqiqiy native desktop

**WebView yo‘q.** Avalonia UI (C# / .NET 8) — Windows uchun to‘liq native render.

## Talablar

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- Windows 10/11

## Qurish va ishga tushirish

```bash
cd platforms/windows
dotnet run
```

Release:

```bash
dotnet publish -c Release -r win-x64 --self-contained
```

## Umumiy kod

`packages/desktop-core/` — API klient va konfiguratsiya (Windows + Linux bilan umumiy).

## Versiya

`node scripts/version-sync.mjs` — `.csproj` va `TcallConfig.AppVersion` yangilanadi.
