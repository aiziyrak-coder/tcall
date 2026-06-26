package uz.tcall.data

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import uz.tcall.network.ChatMessageDto
import uz.tcall.network.ConversationDto
import uz.tcall.network.CreateDirectChatRequest
import uz.tcall.network.CreateGroupChatRequest
import uz.tcall.network.PinConversationRequest
import uz.tcall.network.SendMessageRequest
import uz.tcall.network.TcallApi
import java.io.File

class ChatRepository(private val api: TcallApi) {
    suspend fun loadConversations(): Result<Pair<List<ConversationDto>, Int>> = runCatching {
        val res = api.conversations()
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "Xatolik")
        val body = res.body() ?: throw Exception("Bo'sh javob")
        body.conversations to body.unreadCount
    }

    suspend fun loadMessages(conversationId: String, cursor: String? = null): Result<List<ChatMessageDto>> =
        runCatching {
            val res = api.messages(conversationId, cursor)
            if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "Xatolik")
            res.body()?.messages ?: emptyList()
        }

    suspend fun sendMessage(
        conversationId: String,
        text: String,
        replyToId: String? = null,
    ): Result<ChatMessageDto> = runCatching {
        val res = api.sendMessage(
            conversationId,
            SendMessageRequest(type = "text", text = text.trim(), replyToId = replyToId),
        )
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "Yuborilmadi")
        res.body()?.message ?: throw Exception(res.body()?.error ?: "Xatolik")
    }

    suspend fun editMessage(conversationId: String, messageId: String, text: String): Result<ChatMessageDto> =
        runCatching {
            val res = api.editMessage(conversationId, messageId, uz.tcall.network.EditMessageRequest(text.trim()))
            if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "Tahrirlanmadi")
            res.body()?.message ?: throw Exception(res.body()?.error ?: "Xatolik")
        }

    suspend fun deleteMessage(conversationId: String, messageId: String) = runCatching {
        val res = api.deleteMessage(conversationId, messageId)
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "O'chirilmadi")
    }

    suspend fun pinConversation(conversationId: String, pinned: Boolean) = runCatching {
        val res = api.pinConversation(PinConversationRequest(conversationId, pinned))
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "Pin xatosi")
    }

    suspend fun uploadAndSend(conversationId: String, file: File, mime: String, displayName: String): Result<ChatMessageDto> =
        runCatching {
            val part = MultipartBody.Part.createFormData(
                "file",
                displayName,
                file.asRequestBody(mime.toMediaType()),
            )
            val up = api.uploadChatFile(part)
            if (!up.isSuccessful) throw Exception(up.errorBody()?.string() ?: "Yuklash xatosi")
            val media = up.body() ?: throw Exception("Yuklash javobi yo'q")
            if (media.url.isNullOrBlank() || media.type.isNullOrBlank()) {
                throw Exception(media.error ?: "Yuklash xatosi")
            }
            val res = api.sendMessage(
                conversationId,
                SendMessageRequest(
                    type = media.type!!,
                    mediaUrl = media.url,
                    mediaMime = media.mime,
                    mediaName = media.name ?: displayName,
                ),
            )
            if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "Yuborilmadi")
            res.body()?.message ?: throw Exception(res.body()?.error ?: "Xatolik")
        }

    suspend fun markRead(conversationId: String) {
        runCatching { api.markRead(conversationId) }
    }

    suspend fun deleteConversation(conversationId: String) = runCatching {
        val res = api.deleteConversation(conversationId)
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "O'chirilmadi")
    }

    suspend fun openDirectChat(tcallId: String): Result<String> = runCatching {
        val res = api.createDirectChat(CreateDirectChatRequest(tcallId))
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "Xatolik")
        res.body()?.conversationId ?: throw Exception(res.body()?.error ?: "Chat yaratilmadi")
    }

    suspend fun createGroupChat(name: String, memberTcallIds: List<String>): Result<String> = runCatching {
        val res = api.createGroupChat(CreateGroupChatRequest(name = name, memberTcallIds = memberTcallIds))
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "Xatolik")
        res.body()?.conversationId ?: throw Exception(res.body()?.error ?: "Guruh yaratilmadi")
    }
}
