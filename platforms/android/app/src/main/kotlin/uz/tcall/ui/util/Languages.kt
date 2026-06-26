package uz.tcall.ui.util

data class LangOption(val code: String, val label: String)

val TCALL_LANGUAGES = listOf(
    LangOption("uz", "O'zbek"),
    LangOption("ru", "Русский"),
    LangOption("en", "English"),
    LangOption("tr", "Türkçe"),
    LangOption("ar", "العربية"),
    LangOption("zh", "中文"),
    LangOption("ko", "한국어"),
    LangOption("ja", "日本語"),
    LangOption("de", "Deutsch"),
    LangOption("fr", "Français"),
    LangOption("es", "Español"),
    LangOption("it", "Italiano"),
    LangOption("pt", "Português"),
    LangOption("hi", "हिन्दी"),
    LangOption("fa", "فارسی"),
    LangOption("kk", "Қазақ"),
    LangOption("tg", "Тоҷикӣ"),
    LangOption("ky", "Кыргызча"),
)

fun langLabel(code: String): String =
    TCALL_LANGUAGES.find { it.code == code }?.label ?: code.uppercase()
