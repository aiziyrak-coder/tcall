let activeAudio: HTMLAudioElement | null = null;
let activeStop: (() => void) | null = null;

export function registerChatAudioPlayback(audio: HTMLAudioElement, onStop: () => void) {
  if (activeAudio && activeAudio !== audio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeStop?.();
  }
  activeAudio = audio;
  activeStop = onStop;
}

export function clearChatAudioPlayback(audio: HTMLAudioElement) {
  if (activeAudio === audio) {
    activeAudio = null;
    activeStop = null;
  }
}

export function stopAllChatAudio() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeStop?.();
    activeAudio = null;
    activeStop = null;
  }
}
