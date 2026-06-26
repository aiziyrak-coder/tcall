package uz.tcall.webrtc

import android.content.Context
import android.util.Log
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.webrtc.AudioSource
import org.webrtc.AudioTrack
import org.webrtc.DataChannel
import org.webrtc.IceCandidate
import org.webrtc.MediaConstraints
import org.webrtc.MediaStream
import org.webrtc.PeerConnection
import org.webrtc.PeerConnectionFactory
import org.webrtc.RtpReceiver
import org.webrtc.SdpObserver
import org.webrtc.SessionDescription
import uz.tcall.network.RoomParticipantDto
import uz.tcall.socket.TcallSocketManager

class WebRtcCallManager(
    context: Context,
    private val socketManager: TcallSocketManager,
) {
    private val appContext = context.applicationContext
    private var factory: PeerConnectionFactory? = null
    private var peerConnection: PeerConnection? = null
    private var localAudioTrack: AudioTrack? = null
    private var audioSource: AudioSource? = null
    private var remoteAudioTrack: AudioTrack? = null

    private var roomId: String? = null
    private var mySocketId: String? = null
    private var remoteSocketId: String? = null
    private var iAmHost = false
    private var makingOffer = false

    private val _callState = MutableStateFlow(CallState.IDLE)
    val callState: StateFlow<CallState> = _callState.asStateFlow()

    private val _muted = MutableStateFlow(false)
    val muted: StateFlow<Boolean> = _muted.asStateFlow()

    private var connectedAt = 0L

    fun callDurationMs(): Long =
        if (_callState.value == CallState.CONNECTED && connectedAt > 0) {
            System.currentTimeMillis() - connectedAt
        } else 0L

    fun setMuted(muted: Boolean) {
        _muted.value = muted
        localAudioTrack?.setEnabled(!muted)
    }

    fun toggleMute() = setMuted(!_muted.value)

    enum class CallState { IDLE, CONNECTING, CONNECTED, FAILED, ENDED }

    fun initialize() {
        if (factory != null) return
        val initOpts = PeerConnectionFactory.InitializationOptions.builder(appContext)
            .setEnableInternalTracer(false)
            .createInitializationOptions()
        PeerConnectionFactory.initialize(initOpts)
        factory = PeerConnectionFactory.builder().createPeerConnectionFactory()
    }

    fun startCall(roomId: String, participants: List<RoomParticipantDto>, myUserId: String) {
        this.roomId = roomId
        mySocketId = socketManager.socketId()
        val others = participants.filter { it.userId != myUserId }
        val other = others.firstOrNull()
        remoteSocketId = other?.socketId
        iAmHost = participants.any { it.userId == myUserId && it.isHost == true }
            || (other != null && mySocketId != null && mySocketId!! < other.socketId)

        _callState.value = CallState.CONNECTING
        ensurePeerConnection()
        if (remoteSocketId != null && (iAmHost || shouldOffer(participants, myUserId))) {
            createOffer(remoteSocketId!!)
        }
    }

    private fun shouldOffer(participants: List<RoomParticipantDto>, myUserId: String): Boolean {
        val me = participants.find { it.userId == myUserId } ?: return false
        val other = participants.find { it.userId != myUserId } ?: return false
        if (other.isHost == true) return false
        if (me.isHost == true) return true
        val mySid = mySocketId ?: return false
        return mySid < other.socketId
    }

    fun handleOffer(sdp: String, senderId: String) {
        remoteSocketId = senderId
        _callState.value = CallState.CONNECTING
        ensurePeerConnection()
        val pc = peerConnection ?: return
        val remote = SessionDescription(SessionDescription.Type.OFFER, sdp)
        pc.setRemoteDescription(object : SimpleSdpObserver() {
            override fun onSetSuccess() {
                createAnswer(senderId)
            }
        }, remote)
    }

    fun handleAnswer(sdp: String) {
        val pc = peerConnection ?: return
        pc.setRemoteDescription(
            object : SimpleSdpObserver() {
                override fun onSetSuccess() {
                    markConnected()
                }
            },
            SessionDescription(SessionDescription.Type.ANSWER, sdp),
        )
    }

    fun handleIceCandidate(candidate: String, sdpMid: String?, sdpMLineIndex: Int?) {
        val pc = peerConnection ?: return
        pc.addIceCandidate(IceCandidate(sdpMid, sdpMLineIndex ?: 0, candidate))
    }

    fun requestReofferFromRemote() {
        remoteSocketId?.let { socketManager.emitRequestReoffer(it) }
    }

    fun handleReofferRequest(fromId: String) {
        if (iAmHost || makingOffer) {
            createOffer(fromId)
        }
    }

    private fun ensurePeerConnection() {
        if (peerConnection != null) return
        val f = factory ?: return
        val rtcConfig = PeerConnection.RTCConfiguration(IceServers.servers).apply {
            sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN
            continualGatheringPolicy = PeerConnection.ContinualGatheringPolicy.GATHER_CONTINUALLY
            iceCandidatePoolSize = 4
        }
        peerConnection = f.createPeerConnection(rtcConfig, object : PeerConnection.Observer {
            override fun onSignalingChange(state: PeerConnection.SignalingState?) {}
            override fun onIceConnectionChange(state: PeerConnection.IceConnectionState?) {
                when (state) {
                    PeerConnection.IceConnectionState.CONNECTED,
                    PeerConnection.IceConnectionState.COMPLETED -> markConnected()
                    PeerConnection.IceConnectionState.FAILED -> _callState.value = CallState.FAILED
                    PeerConnection.IceConnectionState.CLOSED -> _callState.value = CallState.ENDED
                    else -> {}
                }
            }
            override fun onIceConnectionReceivingChange(receiving: Boolean) {}
            override fun onIceGatheringChange(state: PeerConnection.IceGatheringState?) {}
            override fun onIceCandidate(candidate: IceCandidate?) {
                val target = remoteSocketId ?: return
                candidate ?: return
                socketManager.emitIceCandidate(
                    target,
                    candidate.sdp,
                    candidate.sdpMid,
                    candidate.sdpMLineIndex,
                )
            }
            override fun onIceCandidatesRemoved(candidates: Array<out IceCandidate>?) {}
            override fun onAddStream(stream: MediaStream?) {}
            override fun onRemoveStream(stream: MediaStream?) {}
            override fun onDataChannel(channel: DataChannel?) {}
            override fun onRenegotiationNeeded() {}
            override fun onAddTrack(receiver: RtpReceiver?, streams: Array<out MediaStream>?) {
                val track = receiver?.track()
                if (track is AudioTrack) {
                    remoteAudioTrack = track
                    track.setEnabled(true)
                }
            }
        })

        val constraints = MediaConstraints().apply {
            mandatory.add(MediaConstraints.KeyValuePair("googEchoCancellation", "true"))
            mandatory.add(MediaConstraints.KeyValuePair("googNoiseSuppression", "true"))
        }
        audioSource = f.createAudioSource(constraints)
        localAudioTrack = f.createAudioTrack("TCALL_AUDIO", audioSource).apply { setEnabled(true) }
        peerConnection?.addTrack(localAudioTrack, listOf("stream"))
    }

    private fun createOffer(targetId: String) {
        makingOffer = true
        val pc = peerConnection ?: return
        pc.createOffer(object : SimpleSdpObserver() {
            override fun onCreateSuccess(desc: SessionDescription?) {
                desc ?: return
                pc.setLocalDescription(object : SimpleSdpObserver() {
                    override fun onSetSuccess() {
                        socketManager.emitOffer(targetId, desc.description)
                        makingOffer = false
                    }
                }, desc)
            }
            override fun onCreateFailure(error: String?) {
                makingOffer = false
                Log.e(TAG, "offer failed: $error")
            }
        }, MediaConstraints())
    }

    private fun createAnswer(targetId: String) {
        val pc = peerConnection ?: return
        pc.createAnswer(object : SimpleSdpObserver() {
            override fun onCreateSuccess(desc: SessionDescription?) {
                desc ?: return
                pc.setLocalDescription(object : SimpleSdpObserver() {
                    override fun onSetSuccess() {
                        socketManager.emitAnswer(targetId, desc.description)
                    }
                }, desc)
            }
        }, MediaConstraints())
    }

    fun end() {
        localAudioTrack?.setEnabled(false)
        localAudioTrack?.dispose()
        audioSource?.dispose()
        remoteAudioTrack?.dispose()
        peerConnection?.close()
        peerConnection?.dispose()
        localAudioTrack = null
        audioSource = null
        remoteAudioTrack = null
        peerConnection = null
        roomId = null
        remoteSocketId = null
        connectedAt = 0L
        _muted.value = false
        _callState.value = CallState.ENDED
    }

    private fun markConnected() {
        if (_callState.value != CallState.CONNECTED) {
            connectedAt = System.currentTimeMillis()
        }
        _callState.value = CallState.CONNECTED
    }

    fun dispose() {
        end()
        factory?.dispose()
        factory = null
        PeerConnectionFactory.stopInternalTracingCapture()
        PeerConnectionFactory.shutdownInternalTracer()
    }

    private open class SimpleSdpObserver : SdpObserver {
        override fun onCreateSuccess(desc: SessionDescription?) {}
        override fun onSetSuccess() {}
        override fun onCreateFailure(error: String?) { Log.e(TAG, error ?: "sdp error") }
        override fun onSetFailure(error: String?) { Log.e(TAG, error ?: "sdp set error") }
    }

    companion object {
        private const val TAG = "WebRtcCall"
    }
}
