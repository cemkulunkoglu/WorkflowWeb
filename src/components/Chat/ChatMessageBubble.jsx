import React from 'react';
import { formatMessageTime } from './chatUtils';

function ChatMessageBubble({ message }) {
  const isMe = message.sender === 'me';

  return (
    <div className={`flex mb-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm border 
          ${isMe
            ? 'bg-blue-600 text-white border-blue-500'
            : 'bg-slate-100 text-slate-900 border-slate-200'
          }`}
      >
        <div className="whitespace-pre-wrap break-words">
          {message.text}
        </div>
        <div
          className={`mt-1 text-[10px] flex items-center gap-1 
            ${isMe ? 'text-blue-100' : 'text-slate-400'}`}
        >
          <span>{formatMessageTime(message.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

export default ChatMessageBubble;


