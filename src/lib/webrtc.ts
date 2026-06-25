/** WebRTC ICE serverlar — STUN + TURN (mobil NAT uchun) */
export function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    {
      urls: [
        "turn:openrelay.metered.ca:443?transport=tcp",
        "turn:openrelay.metered.ca:80?transport=tcp",
        "turn:openrelay.metered.ca:443",
        "turn:openrelay.metered.ca:80",
      ],
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: [
        "turn:global.relay.metered.ca:443?transport=tcp",
        "turn:global.relay.metered.ca:80?transport=tcp",
        "turn:global.relay.metered.ca:443",
        "turn:global.relay.metered.ca:80",
      ],
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ];

  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
    });
  }

  return servers;
}

export function getPeerConnectionConfig(opts?: { preferRelay?: boolean }): RTCConfiguration {
  return {
    iceServers: getIceServers(),
    iceCandidatePoolSize: 10,
    bundlePolicy: "max-compat",
    rtcpMuxPolicy: "require",
    iceTransportPolicy: opts?.preferRelay ? "relay" : "all",
  };
}
