package uz.tcall.network

import com.google.gson.annotations.SerializedName

data class UserDto(
    @SerializedName("userId") val userId: String,
    @SerializedName("email") val email: String,
    @SerializedName("name") val name: String,
    @SerializedName("language") val language: String,
    @SerializedName("tcallId") val tcallId: String,
    @SerializedName("translationMode") val translationMode: String? = "text",
)

data class LoginRequest(
    val email: String,
    val password: String,
    val remember: Boolean = true,
)

data class LoginResponse(
    val user: UserDto?,
    val token: String? = null,
    val error: String? = null,
)

data class SessionResponse(
    val user: UserDto?,
)

data class ErrorResponse(
    val error: String? = null,
    @SerializedName("requiresPlan") val requiresPlan: String? = null,
)

// ——— Chat ———

data class ChatMemberDto(
    val userId: String,
    val name: String,
    val tcallId: String?,
    val language: String?,
)

data class ChatMessageDto(
    val id: String,
    val type: String,
    val originalText: String?,
    val displayText: String?,
    @SerializedName("sourceLang") val sourceLang: String? = null,
    @SerializedName("hasTranslation") val hasTranslation: Boolean? = false,
    val mediaUrl: String?,
    val mediaMime: String?,
    val mediaName: String?,
    val createdAt: String,
    val sender: ChatSenderDto,
    val deleted: Boolean? = false,
    val readStatus: String? = null,
)

data class ChatSenderDto(
    val id: String,
    val name: String,
    val tcallId: String?,
    val language: String?,
)

data class ConversationDto(
    val id: String,
    val type: String,
    val title: String,
    val lastPreview: String?,
    val unreadCount: Int,
    val updatedAt: String,
    val peerOnline: Boolean? = false,
    val members: List<ChatMemberDto>? = null,
    val lastMessage: ChatMessageDto? = null,
)

data class ConversationsResponse(
    val conversations: List<ConversationDto>,
    @SerializedName("unreadCount") val unreadCount: Int,
)

data class MessagesResponse(
    val messages: List<ChatMessageDto>,
    val hasMore: Boolean,
)

data class SendMessageRequest(
    val type: String = "text",
    val text: String? = null,
)

data class SendMessageResponse(
    val message: ChatMessageDto?,
    val error: String? = null,
)

data class CreateDirectChatRequest(
    val tcallId: String,
)

data class CreateGroupChatRequest(
    val type: String = "group",
    val name: String,
    @SerializedName("memberTcallIds") val memberTcallIds: List<String>,
)

data class CreateChatResponse(
    val conversationId: String?,
    val error: String? = null,
)

data class SocketChatMessageEvent(
    val conversationId: String,
    val message: ChatMessageDto,
)

// ——— Calls ———

data class DialRequest(
    val tcallId: String,
)

data class DialResponse(
    val roomId: String?,
    val callId: String?,
    val error: String? = null,
    val calleeOnline: Boolean? = null,
)

data class JoinCallRequest(
    val roomId: String,
)

data class JoinCallResponse(
    val ok: Boolean? = null,
    val error: String? = null,
)

data class EndCallRequest(
    val roomId: String,
)

data class IncomingCallEvent(
    val roomId: String,
    val callId: String?,
    val caller: IncomingCallerDto,
)

data class IncomingCallerDto(
    val userId: String,
    val name: String,
    val language: String?,
    val tcallId: String?,
)

data class RoomParticipantDto(
    val socketId: String,
    val userId: String,
    val name: String,
    val language: String,
    val isHost: Boolean? = false,
)

// ——— Interpreter ———

data class InterpreterResponse(
    val original: String?,
    val translated: String?,
    val sourceLang: String?,
    val targetLang: String?,
    val audioBase64: String? = null,
    val error: String? = null,
)

// ——— Push ———

data class DeviceTokenRequest(
    val token: String,
    val platform: String = "android",
)

data class OkResponse(
    val ok: Boolean? = null,
)
