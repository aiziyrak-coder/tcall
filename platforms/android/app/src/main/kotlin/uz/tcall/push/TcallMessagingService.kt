package uz.tcall.push

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import uz.tcall.MainActivity
import uz.tcall.R

class TcallMessagingService : FirebaseMessagingService() {

    override fun onMessageReceived(message: RemoteMessage) {
        val data = message.data
        val type = data["type"] ?: return
        val title = message.notification?.title ?: data["title"] ?: "Tcall"
        val body = message.notification?.body ?: data["body"] ?: ""

        when (type) {
            "incoming_call" -> notify(
                id = ID_CALL,
                title = title,
                body = body.ifBlank { "Kiruvchi qo'ng'iroq" },
                channel = CH_CALLS,
                roomId = data["roomId"],
                high = true,
            )
            "chat_message" -> notify(
                id = data["conversationId"]?.hashCode() ?: 2,
                title = title,
                body = body.ifBlank { "Yangi xabar" },
                channel = CH_CHAT,
                conversationId = data["conversationId"],
            )
            else -> notify(3, title, body, CH_GENERAL)
        }
    }

    private fun notify(
        id: Int,
        title: String,
        body: String,
        channel: String,
        roomId: String? = null,
        conversationId: String? = null,
        high: Boolean = false,
    ) {
        val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            nm.createNotificationChannel(
                NotificationChannel(channel, channel, NotificationManager.IMPORTANCE_HIGH),
            )
        }
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            roomId?.let { putExtra(EXTRA_ROOM, it) }
            conversationId?.let { putExtra(EXTRA_CHAT, it) }
        }
        val pi = PendingIntent.getActivity(
            this, id, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val n = NotificationCompat.Builder(this, channel)
            .setSmallIcon(R.drawable.ic_stat_tcall)
            .setContentTitle(title)
            .setContentText(body)
            .setContentIntent(pi)
            .setAutoCancel(true)
            .setPriority(if (high) NotificationCompat.PRIORITY_MAX else NotificationCompat.PRIORITY_DEFAULT)
            .build()
        nm.notify(id, n)
    }

    companion object {
        const val EXTRA_ROOM = "roomId"
        const val EXTRA_CHAT = "conversationId"
        private const val ID_CALL = 1001
        private const val CH_CALLS = "tcall_calls"
        private const val CH_CHAT = "tcall_chat"
        private const val CH_GENERAL = "tcall_general"
    }
}
