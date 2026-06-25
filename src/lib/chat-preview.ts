import { getUI } from "./languages";

type PreviewMsg = {
  type: string;
  originalText: string | null;
  mediaName: string | null;
  displayText?: string | null;
  deleted?: boolean;
};

export function formatMessagePreview(msg: PreviewMsg, userLang: string): string {
  const ui = getUI(userLang);
  if (msg.deleted) return ui.chatMessageDeleted;

  const text = msg.displayText ?? msg.originalText ?? "";
  if (msg.type === "image") return "📷 " + (text || ui.chatPhoto);
  if (msg.type === "video") return "🎬 " + (text || ui.chatVideo);
  if (msg.type === "file") return "📎 " + (msg.mediaName || ui.chatFile);
  return text;
}
