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

class TcallFirebaseMessagingService : FirebaseMessagingService() {
    override fun onMessageReceived(message: RemoteMessage) {
        val data = message.data
        val type = data["type"] ?: return
        val title = message.notification?.title ?: data["title"] ?: "Tcall"
        val body = message.notification?.body ?: data["body"] ?: ""

        when (type) {
            "incoming_call" -> showNotification(
                id = INCOMING_CALL_ID,
                title = title,
                body = body.ifBlank { "Kiruvchi qo'ng'iroq" },
                roomId = data["roomId"],
                channelId = CHANNEL_CALLS,
                highPriority = true,
            )
            "chat_message" -> showNotification(
                id = (data["conversationId"]?.hashCode() ?: 2),
                title = title,
                body = body.ifBlank { "Yangi xabar" },
                conversationId = data["conversationId"],
                channelId = CHANNEL_CHAT,
            )
            else -> showNotification(
                id = 3,
                title = title,
                body = body,
                channelId = CHANNEL_GENERAL,
            )
        }
    }

    private fun showNotification(
        id: Int,
        title: String,
        body: String,
        roomId: String? = null,
        conversationId: String? = null,
        channelId: String,
        highPriority: Boolean = false,
    ) {
        val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            nm.createNotificationChannel(
                NotificationChannel(channelId, channelId, NotificationManager.IMPORTANCE_HIGH).apply {
                    if (highPriority) setBypassDnd(true)
                }
            )
        }

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            roomId?.let { putExtra(EXTRA_ROOM_ID, it) }
            conversationId?.let { putExtra(EXTRA_CONVERSATION_ID, it) }
        }
        val pending = PendingIntent.getActivity(
            this,
            id,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_stat_tcall)
            .setContentTitle(title)
            .setContentText(body)
            .setContentIntent(pending)
            .setAutoCancel(true)
            .setPriority(if (highPriority) NotificationCompat.PRIORITY_MAX else NotificationCompat.PRIORITY_DEFAULT)
            .build()

        nm.notify(id, notification)
    }

    companion object {
        const val EXTRA_ROOM_ID = "roomId"
        const val EXTRA_CONVERSATION_ID = "conversationId"
        private const val INCOMING_CALL_ID = 1001
        private const val CHANNEL_CALLS = "tcall_calls"
        private const val CHANNEL_CHAT = "tcall_chat"
        private const val CHANNEL_GENERAL = "tcall_general"
    }
}
