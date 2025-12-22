import React from "react";

function formatTrDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("tr-TR");
}

// Backend MessageId "mükemmel key" olduğu için önce onu kullanıyoruz.
export function getMessageId(msg) {
  return msg?.MessageId || msg?.messageId || msg?.messageID || msg?.MessageID || msg?.id || "";
}

export default function ChatMessageBubble({ message }) {
  // Yeni format: senderType (User/AI)
  // Eski/alternatif formatlara da tolerans gösterelim (sender: 'me')
  const senderType = message?.senderType ?? message?.SenderType;
  const isUser =
    senderType === "User" ||
    message?.sender === "me" ||
    message?.sender === "user";

  const side = isUser ? "user" : "ai";
  const text = message?.text ?? message?.Text ?? "";
  const createdAtUtc =
    message?.createdAtUtc ??
    message?.CreatedAtUtc ??
    message?.createdAt ??
    message?.CreatedAt ??
    "";

  return (
    <div className={`chatw-row ${side}`}>
      <div className={`chatw-bubble ${side}`}>
        <div className="chatw-text">{text}</div>
        {createdAtUtc ? <div className="chatw-time">{formatTrDate(createdAtUtc)}</div> : null}
      </div>
    </div>
  );
}


