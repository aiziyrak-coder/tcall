# tcall-core — umumiy kontrakt

Barcha platformalar (Android, iOS, Windows, Linux) uchun yagona manba.

## Fayllar

| Fayl | Maqsad |
|------|--------|
| `version.json` | `major` + `patch` — versiya manbasi |
| `api/endpoints.json` | API yo‘llari va header nomlari |

## Versiya

Format: `{major}.{patch 6 xonada}` — masalan `1.000000`, `1.000001`, `2.000000`

```bash
node scripts/version-bump.mjs          # patch +1
node scripts/version-bump.mjs --major  # yangi major
node scripts/version-sync.mjs        # barcha platformalarga yozish
```

## O‘zgartirish qoidalari

1. API yo‘li o‘zgarsa — `api/endpoints.json` ni yangilang
2. Har bir platforma o‘z tilida shu kontraktni o‘qiydi (qo‘lda yoki keyinroq codegen)
3. Versiya faqat `version.json` dan boshqariladi
