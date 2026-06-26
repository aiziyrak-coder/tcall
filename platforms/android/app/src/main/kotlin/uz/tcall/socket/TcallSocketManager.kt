package uz.tcall.socket

import android.util.Log
import com.google.gson.Gson
import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONObject
import uz.tcall.BuildConfig
import uz.tcall.network.IncomingCallEvent
import uz.tcall.network.RoomParticipantDto
import uz.tcall.network.SocketChatMessageEvent
import uz.tcall.network.UserDto
import java.net.URI

class TcallSocketManager(private val gson: Gson = Gson()) {
    private var socket: Socket? = null
    private var currentToken: String? = null

    private val _connected = MutableStateFlow(false)
    val connected: StateFlow<Boolean> = _connected.asStateFlow()

    private val _incomingCall = MutableSharedFlow<IncomingCallEvent>(extraBufferCapacity = 1)
    val incomingCall: SharedFlow<IncomingCallEvent> = _incomingCall.asSharedFlow()

    private val _chatMessage = MutableSharedFlow<SocketChatMessageEvent>(extraBufferCapacity = 8)
    val chatMessage: SharedFlow<SocketChatMessageEvent> = _chatMessage.asSharedFlow()

    private val _roomUsers = MutableSharedFlow<List<RoomParticipantDto>>(extraBufferCapacity = 4)
    val roomUsers: SharedFlow<List<RoomParticipantDto>> = _roomUsers.asSharedFlow()

    private val _callAccepted = MutableSharedFlow<String>(extraBufferCapacity = 1)
    val callAccepted: SharedFlow<String> = _callAccepted.asSharedFlow()

    private val _callRejected = MutableSharedFlow<String>(extraBufferCapacity = 1)
    val callRejected: SharedFlow<String> = _callRejected.asSharedFlow()

    private val _roomError = MutableSharedFlow<String>(extraBufferCapacity = 2)
    val roomError: SharedFlow<String> = _roomError.asSharedFlow()

    private val _offer = MutableSharedFlow<SignalingPayload>(extraBufferCapacity = 2)
    val offer: SharedFlow<SignalingPayload> = _offer.asSharedFlow()

    private val _answer = MutableSharedFlow<SignalingPayload>(extraBufferCapacity = 2)
    val answer: SharedFlow<SignalingPayload> = _answer.asSharedFlow()

    private val _iceCandidate = MutableSharedFlow<IcePayload>(extraBufferCapacity = 16)
    val iceCandidate: SharedFlow<IcePayload> = _iceCandidate.asSharedFlow()

    private val _requestReoffer = MutableSharedFlow<String>(extraBufferCapacity = 2)
    val requestReoffer: SharedFlow<String> = _requestReoffer.asSharedFlow()

    data class SignalingPayload(val sdp: String, val senderId: String)
    data class IcePayload(val candidate: String, val sdpMid: String?, val sdpMLineIndex: Int?, val senderId: String)

    fun connect(token: String) {
        if (token == currentToken && socket?.connected() == true) return
        disconnect()
        currentToken = token

        val opts = IO.Options().apply {
            forceNew = true
            reconnection = true
            transports = arrayOf("websocket", "polling")
            extraHeaders = mapOf("Authorization" to listOf("Bearer $token"))
            auth = mapOf("token" to token)
        }

        val s = IO.socket(URI.create(BuildConfig.SOCKET_URL), opts)
        socket = s

        s.on(Socket.EVENT_CONNECT) {
            _connected.value = true
            s.emit(SocketEvents.REGISTER_USER, JSONObject().put("translationMode", "text"))
        }
        s.on(Socket.EVENT_DISCONNECT) { _connected.value = false }
        s.on(Socket.EVENT_CONNECT_ERROR) { args ->
            Log.w(TAG, "Socket connect error: ${args.firstOrNull()}")
            _connected.value = false
        }

        s.on(SocketEvents.INCOMING_CALL) { args ->
            parseJson<IncomingCallEvent>(args)?.let { _incomingCall.tryEmit(it) }
        }
        s.on(SocketEvents.CHAT_MESSAGE) { args ->
            parseJson<SocketChatMessageEvent>(args)?.let { _chatMessage.tryEmit(it) }
        }
        s.on(SocketEvents.CALL_ACCEPTED) { args ->
            (args.getOrNull(0) as? JSONObject)?.optString("roomId")?.takeIf { it.isNotBlank() }
                ?.let { _callAccepted.tryEmit(it) }
        }
        s.on(SocketEvents.CALL_REJECTED) { args ->
            (args.getOrNull(0) as? JSONObject)?.optString("roomId")?.takeIf { it.isNotBlank() }
                ?.let { _callRejected.tryEmit(it) }
        }
        s.on(SocketEvents.ROOM_USERS) { args ->
            val arr = args.getOrNull(0) as? org.json.JSONArray ?: return@on
            val list = (0 until arr.length()).mapNotNull { i ->
                val o = arr.optJSONObject(i) ?: return@mapNotNull null
                RoomParticipantDto(
                    socketId = o.optString("socketId"),
                    userId = o.optString("userId"),
                    name = o.optString("name"),
                    language = o.optString("language"),
                    isHost = o.optBoolean("isHost", false),
                )
            }
            _roomUsers.tryEmit(list)
        }
        s.on(SocketEvents.ROOM_ERROR) { args ->
            (args.getOrNull(0) as? JSONObject)?.optString("message")?.let { _roomError.tryEmit(it) }
        }
        s.on(SocketEvents.ROOM_FULL) { args ->
            val msg = (args.getOrNull(0) as? JSONObject)?.optString("message") ?: "Xona band"
            _roomError.tryEmit(msg)
        }
        s.on(SocketEvents.OFFER) { args ->
            val o = args.getOrNull(0) as? JSONObject ?: return@on
            val offer = o.optJSONObject("offer") ?: return@on
            val sdp = offer.optString("sdp")
            val senderId = o.optString("senderId")
            if (sdp.isNotBlank()) _offer.tryEmit(SignalingPayload(sdp, senderId))
        }
        s.on(SocketEvents.ANSWER) { args ->
            val o = args.getOrNull(0) as? JSONObject ?: return@on
            val answer = o.optJSONObject("answer") ?: return@on
            val sdp = answer.optString("sdp")
            val senderId = o.optString("senderId")
            if (sdp.isNotBlank()) _answer.tryEmit(SignalingPayload(sdp, senderId))
        }
        s.on(SocketEvents.ICE_CANDIDATE) { args ->
            val o = args.getOrNull(0) as? JSONObject ?: return@on
            val c = o.optJSONObject("candidate") ?: return@on
            _iceCandidate.tryEmit(
                IcePayload(
                    candidate = c.optString("candidate"),
                    sdpMid = c.optString("sdpMid").ifBlank { null },
                    sdpMLineIndex = if (c.has("sdpMLineIndex")) c.optInt("sdpMLineIndex") else null,
                    senderId = o.optString("senderId"),
                )
            )
        }
        s.on(SocketEvents.REQUEST_REOFFER) { args ->
            (args.getOrNull(0) as? JSONObject)?.optString("fromId")?.let { _requestReoffer.tryEmit(it) }
        }

        s.connect()
    }

    fun disconnect() {
        socket?.off()
        socket?.disconnect()
        socket = null
        currentToken = null
        _connected.value = false
    }

    fun joinRoom(roomId: String, user: UserDto) {
        val payload = JSONObject()
            .put("roomId", roomId)
            .put("userId", user.userId)
            .put("name", user.name)
            .put("language", user.language)
            .put("translationMode", user.translationMode ?: "text")
            .put("isHost", false)
        socket?.emit(SocketEvents.JOIN_ROOM, payload)
    }

    fun leaveRoom(roomId: String) {
        socket?.emit(SocketEvents.LEAVE_ROOM, JSONObject().put("roomId", roomId))
    }

    fun emitOffer(targetId: String, sdp: String) {
        val offer = JSONObject().put("type", "offer").put("sdp", sdp)
        socket?.emit(SocketEvents.OFFER, JSONObject().put("offer", offer).put("targetId", targetId))
    }

    fun emitAnswer(targetId: String, sdp: String) {
        val answer = JSONObject().put("type", "answer").put("sdp", sdp)
        socket?.emit(SocketEvents.ANSWER, JSONObject().put("answer", answer).put("targetId", targetId))
    }

    fun emitIceCandidate(targetId: String, candidate: String, sdpMid: String?, sdpMLineIndex: Int?) {
        val c = JSONObject().put("candidate", candidate)
        sdpMid?.let { c.put("sdpMid", it) }
        sdpMLineIndex?.let { c.put("sdpMLineIndex", it) }
        socket?.emit(SocketEvents.ICE_CANDIDATE, JSONObject().put("candidate", c).put("targetId", targetId))
    }

    fun emitRequestReoffer(targetId: String) {
        socket?.emit(SocketEvents.REQUEST_REOFFER, JSONObject().put("targetId", targetId))
    }

    fun acceptCall(roomId: String) {
        socket?.emit(SocketEvents.CALL_ACCEPT, JSONObject().put("roomId", roomId))
    }

    fun rejectCall(roomId: String) {
        socket?.emit(SocketEvents.CALL_REJECT, JSONObject().put("roomId", roomId))
    }

    fun cancelCall(roomId: String) {
        socket?.emit(SocketEvents.CALL_CANCEL, JSONObject().put("roomId", roomId))
    }

    fun endCall() {
        socket?.emit(SocketEvents.CALL_ENDED)
    }

    fun emitChatTyping(conversationId: String) {
        socket?.emit(SocketEvents.CHAT_TYPING, JSONObject().put("conversationId", conversationId))
    }

    fun emitChatTypingStop(conversationId: String) {
        socket?.emit(SocketEvents.CHAT_TYPING_STOP, JSONObject().put("conversationId", conversationId))
    }

    fun socketId(): String? = socket?.id()

    private inline fun <reified T> parseJson(args: Array<Any>): T? {
        val raw = args.getOrNull(0) ?: return null
        return try {
            when (raw) {
                is JSONObject -> gson.fromJson(raw.toString(), T::class.java)
                is String -> gson.fromJson(raw, T::class.java)
                else -> gson.fromJson(gson.toJson(raw), T::class.java)
            }
        } catch (e: Exception) {
            Log.w(TAG, "parse error", e)
            null
        }
    }

    companion object {
        private const val TAG = "TcallSocket"
    }
}
