import React, { useEffect, useMemo, useRef, useState } from 'react';
import ChatMessageBubble from './ChatMessageBubble';
import { initialChatMessages } from './chatSeed';
import { generateMessageId } from './chatUtils';
import './ChatWidget.css';

const TABS = {
  HUMAN: 'human',
  AI: 'ai',
};

function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(TABS.HUMAN);
  const [messages, setMessages] = useState(initialChatMessages);
  const [inputValue, setInputValue] = useState('');
  const [panelHeight, setPanelHeight] = useState(384); // px, varsayılan yükseklik

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const filteredMessages = useMemo(
    () => messages.filter((m) => m.mode === activeTab),
    [messages, activeTab]
  );

  useEffect(() => {
    if (!isOpen) return;
    if (!messagesEndRef.current) return;

    messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [filteredMessages, isOpen]);

  const handleToggleOpen = () => {
    setIsOpen((prev) => !prev);
  };

  const handleChangeTab = (tabKey) => {
    setActiveTab(tabKey);
  };

  const handleSendMessage = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const newMessage = {
      id: generateMessageId(),
      mode: activeTab,
      sender: 'me',
      text: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputValue('');

    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  };

  const handleInputKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (event) => {
    const el = event.target;
    setInputValue(el.value);

    if (!el) return;
    el.style.height = 'auto';
    const maxHeight = 96; // ~3-4 satır
    const nextHeight = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${nextHeight}px`;
  };

  const handleHeaderMouseDown = (event) => {
    // Sadece sol tık ve butonların üzerinde değilken çalışsın
    if (event.button !== 0) return;
    if (event.target.closest && event.target.closest('button')) return;

    event.preventDefault();

    const startY = event.clientY;
    const startHeight = panelHeight;

    const handleMouseMove = (moveEvent) => {
      const deltaY = startY - moveEvent.clientY; // Yukarı çekince pozitif
      const nextHeight = Math.max(280, Math.min(560, startHeight + deltaY));
      setPanelHeight(nextHeight);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const badgeText =
    activeTab === TABS.HUMAN ? 'Yetkili aktif' : 'AI hazır';

  const badgeColorClasses =
    activeTab === TABS.HUMAN
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : 'bg-indigo-100 text-indigo-700 border-indigo-200';

  return (
    <>
      <div className="fixed bottom-3 right-3 z-50">
        {/* Panel */}
        <div
          className={`origin-bottom-right mb-14 w-80 sm:w-96 transform transition-all duration-200 ease-out
            ${isOpen
              ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
              : 'opacity-0 translate-y-3 scale-95 pointer-events-none'
            }`}
        >
          <div
            className="rounded-2xl shadow-2xl bg-white border border-slate-200 backdrop-blur-sm overflow-hidden flex flex-col"
            style={{ height: panelHeight }}
          >
            {/* Header */}
            <div
              className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 cursor-ns-resize select-none"
              onMouseDown={handleHeaderMouseDown}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">
                    Workflow Chat
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Hızlı sorularınız için mini destek alanı.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${badgeColorClasses}`}
                >
                  {badgeText}
                </span>
                <button
                  type="button"
                  onClick={handleToggleOpen}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                  aria-label="Mini chat panelini kapat"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M6 6L14 14M14 6L6 14"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="px-3 pt-2 pb-1 border-b border-slate-200 bg-white/90">
              <div className="inline-flex rounded-full p-1 bg-slate-100">
                <button
                  type="button"
                  onClick={() => handleChangeTab(TABS.HUMAN)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-all
                    ${activeTab === TABS.HUMAN
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  Yetkili
                </button>
                <button
                  type="button"
                  onClick={() => handleChangeTab(TABS.AI)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-all
                    ${activeTab === TABS.AI
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  Yapay Zeka
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-3 py-2 bg-white/80 chat-scroll">
              {filteredMessages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-xs text-slate-400 text-center">
                    Henüz mesaj yok, yazmaya başla.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredMessages.map((message) => (
                    <ChatMessageBubble key={message.id} message={message} />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 bg-slate-50/90 px-3 py-2">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <textarea
                    rows={1}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleInputKeyDown}
                    ref={inputRef}
                    placeholder={
                      activeTab === TABS.HUMAN
                        ? 'Yetkiliye mesaj yaz...'
                        : 'Yapay Zeka\'ya mesaj yaz...'
                    }
                    className="w-full resize-none overflow-y-auto chat-scroll text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim()}
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-semibold shadow-md transition-all
                    ${inputValue.trim()
                      ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    }`}
                  aria-label="Mesaj gönder"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M4 4L20 12L4 20L8 12L4 4Z"
                      fill="currentColor"
                    />
                    <path
                      d="M4 4L12 12L4 20"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
              <p className="mt-1 text-[10px] text-slate-400">
                Enter: gönder • Shift+Enter: yeni satır
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Button */}
      <button
        type="button"
        onClick={handleToggleOpen}
        className="fixed bottom-3 right-2 z-50 w-12 h-12 rounded-full bg-blue-600 text-white shadow-xl flex items-center justify-center text-xl font-semibold hover:bg-blue-700 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        aria-label="Mini chat panelini aç/kapat"
      >
        {isOpen ? (
          <svg
            className="w-5 h-5"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 6L14 14M14 6L6 14"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg
            className="w-6 h-6"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M5 5H19C20.1046 5 21 5.89543 21 7V14C21 15.1046 20.1046 16 19 16H9.5L6 19.5V16H5C3.89543 16 3 15.1046 3 14V7C3 5.89543 3.89543 5 5 5Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M8 9H16"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d="M8 12H13"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>
    </>
  );
}

export default ChatWidget;


