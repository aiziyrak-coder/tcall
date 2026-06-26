# Tcall Linux — haqiqiy native desktop

**WebView yo‘q.** Avalonia UI (C# / .NET 8) — Ubuntu, Debian, Kali va boshqa distributivlar.

## Talablar

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- libx11 (odatda o‘rnatilgan)

Ubuntu/Debian:

```bash
sudo apt update
sudo apt install -y dotnet-sdk-8.0
```

## Qurish va ishga tushirish

```bash
cd platforms/linux
dotnet run
```

Release:

```bash
dotnet publish -c Release -r linux-x64 --self-contained
```

## Umumiy kod

`packages/desktop-core/` — API klient va konfiguratsiya (Windows bilan umumiy).

## Versiya

`node scripts/version-sync.mjs` — `.csproj` va `TcallConfig.AppVersion` yangilanadi.
