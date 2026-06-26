import type { ReactNode } from "react";

const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/gi;

export function linkifyText(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(URL_RE.source, URL_RE.flags);

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    const url = match[0];
    parts.push(
      <a
        key={`${match.index}-${url}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="chat-link"
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>
    );
    last = match.index + url.length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : [text];
}
