package uz.tcall.ui.util

import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

fun formatShortTime(iso: String): String? = runCatching {
    val normalized = iso.replace("Z", "+00:00")
    val parsers = listOf(
        "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
        "yyyy-MM-dd'T'HH:mm:ssXXX",
        "yyyy-MM-dd'T'HH:mm:ss",
    )
    var date: java.util.Date? = null
    for (pattern in parsers) {
        date = runCatching {
            SimpleDateFormat(pattern, Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") }.parse(normalized)
        }.getOrNull()
        if (date != null) break
    }
    date ?: return null
    SimpleDateFormat("HH:mm", Locale.getDefault()).format(date)
}.getOrNull()

fun formatCallDuration(sec: Int?): String {
    val s = sec ?: 0
    val m = s / 60
    val r = s % 60
    return "$m:${r.toString().padStart(2, '0')}"
}
