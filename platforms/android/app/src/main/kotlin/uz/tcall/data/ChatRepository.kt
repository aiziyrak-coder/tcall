package uz.tcall.data

import uz.tcall.network.ChatMessageDto
import uz.tcall.network.ConversationDto
import uz.tcall.network.CreateDirectChatRequest
import uz.tcall.network.CreateGroupChatRequest
import uz.tcall.network.SendMessageRequest
import uz.tcall.network.TcallApi

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

    suspend fun sendMessage(conversationId: String, text: String): Result<ChatMessageDto> = runCatching {
        val res = api.sendMessage(conversationId, SendMessageRequest(type = "text", text = text.trim()))
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "Yuborilmadi")
        res.body()?.message ?: throw Exception(res.body()?.error ?: "Xatolik")
    }

    suspend fun markRead(conversationId: String) {
        runCatching { api.markRead(conversationId) }
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
