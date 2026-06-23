export interface SignalingOffer {
  offer: RTCSessionDescriptionInit;
  senderId: string;
}

export interface SignalingAnswer {
  answer: RTCSessionDescriptionInit;
  senderId: string;
}

export interface SignalingCandidate {
  candidate: RTCIceCandidateInit;
  senderId: string;
}

export interface RoomParticipant {
  socketId: string;
  userId: string;
  name: string;
  language: string;
  isHost?: boolean;
}

export interface TranslationPayload {
  original: string;
  translated: string;
  sourceLang: string;
  targetLang: string;
  speaker: string;
  isFinal: boolean;
  audioBase64?: string;
}
