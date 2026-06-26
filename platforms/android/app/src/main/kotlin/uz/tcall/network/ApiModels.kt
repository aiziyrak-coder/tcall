package uz.tcall.network

import com.google.gson.annotations.SerializedName

data class UserDto(
    @SerializedName("userId") val userId: String,
    @SerializedName("email") val email: String,
    @SerializedName("name") val name: String,
    @SerializedName("language") val language: String,
    @SerializedName("tcallId") val tcallId: String = "",
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
    val token: String? = null,
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

data class ChatReplyPreviewDto(
    val id: String,
    @SerializedName("senderName") val senderName: String,
    val preview: String,
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
    val edited: Boolean? = false,
    @SerializedName("replyTo") val replyTo: ChatReplyPreviewDto? = null,
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
    @SerializedName("mediaUrl") val mediaUrl: String? = null,
    @SerializedName("mediaMime") val mediaMime: String? = null,
    @SerializedName("mediaName") val mediaName: String? = null,
    @SerializedName("replyToId") val replyToId: String? = null,
)

data class EditMessageRequest(val text: String)

data class PinConversationRequest(
    @SerializedName("conversationId") val conversationId: String,
    val pinned: Boolean,
)

data class SocketChatTypingEvent(
    val conversationId: String,
    val userId: String,
    val typing: Boolean,
    val draft: String? = null,
)

data class SocketChatMessageDeletedEvent(
    val conversationId: String,
    @SerializedName("messageId") val messageId: String,
)

data class SocketChatMessageEditedEvent(
    val conversationId: String,
    @SerializedName("messageId") val messageId: String,
    val message: ChatMessageDto,
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
    val error: String? = null,
)

// ——— Auth ———

data class RegisterRequest(
    val email: String,
    val password: String,
    val name: String,
    val language: String = "uz",
    val ref: String? = null,
)

data class ForgotPasswordRequest(
    val email: String,
)

data class ForgotPasswordResponse(
    val ok: Boolean? = null,
    val message: String? = null,
    val error: String? = null,
)

// ——— Subscription ———

data class SubscriptionResponse(
    val plan: String? = null,
    val subscription: SubscriptionDto? = null,
    val prices: Map<String, Double>? = null,
    @SerializedName("pricesUzs") val pricesUzs: Map<String, Int>? = null,
    val features: Map<String, List<String>>? = null,
    @SerializedName("pendingPayment") val pendingPayment: PendingPaymentDto? = null,
    @SerializedName("paymentConfigured") val paymentConfigured: Boolean? = false,
    val error: String? = null,
    val ok: Boolean? = null,
    val payment: PendingPaymentDto? = null,
)

data class SubscriptionDto(
    val plan: String?,
    val status: String?,
    @SerializedName("expiresAt") val expiresAt: String?,
)

data class PendingPaymentDto(
    val id: String,
    val plan: String,
    val amount: Int,
    val currency: String,
    val status: String,
    @SerializedName("paymentUrl") val paymentUrl: String? = null,
    @SerializedName("expiresAt") val expiresAt: String? = null,
)

data class PurchaseSubscriptionRequest(
    val plan: String,
    @SerializedName("durationDays") val durationDays: Int = 30,
)

// ——— PIN ———

data class PinStatusResponse(
    val enabled: Boolean? = false,
    @SerializedName("faceEnrolled") val faceEnrolled: Boolean? = false,
    val error: String? = null,
)

data class PinBodyRequest(
    val pin: String,
    @SerializedName("faceImage") val faceImage: String? = null,
    @SerializedName("currentPin") val currentPin: String? = null,
)

data class PinVerifyRequest(
    val pin: String,
)

// ——— Referral / account ———

data class ReferralResponse(
    val code: String?,
    @SerializedName("inviteUrl") val inviteUrl: String?,
    @SerializedName("profileUrl") val profileUrl: String?,
    @SerializedName("referredCount") val referredCount: Int? = 0,
    val error: String? = null,
)

data class DeleteAccountRequest(
    val password: String,
)

data class AvatarUploadResponse(
    val ok: Boolean? = null,
    val url: String? = null,
    val error: String? = null,
)

data class TelegramStatusResponse(
    val configured: Boolean? = false,
    val linked: Boolean? = false,
    val username: String? = null,
    val error: String? = null,
)

data class TelegramLinkResponse(
    val url: String?,
    @SerializedName("botUsername") val botUsername: String? = null,
    @SerializedName("expiresInSec") val expiresInSec: Int? = null,
    val error: String? = null,
)

data class PinChangeRequest(
    @SerializedName("currentPin") val currentPin: String,
    val pin: String,
)

// ——— Chat media ———

data class ChatUploadResponse(
    val url: String?,
    val mime: String?,
    val name: String?,
    val size: Long? = null,
    val type: String?,
    val error: String? = null,
)

