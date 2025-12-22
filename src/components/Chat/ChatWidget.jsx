import { useEffect, useMemo, useRef, useState } from "react";
import ChatMessageBubble, { getMessageId } from "./ChatMessageBubble";

const STREAM_URL = "https://localhost:7299/stream";
const SEND_URL = "https://localhost:7299/api/chat/send";

function makeLocalMessageId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `local-${crypto.randomUUID()}`;
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const seenIdsRef = useRef(new Set());
  const [inputText, setInputText] = useState("");
  const [connected, setConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sseError, setSseError] = useState("");
  const [aiTyping, setAiTyping] = useState(false);
  const [eventCount, setEventCount] = useState(0); // accepted (global + messageId + non-dup)
  const [rawEventCount, setRawEventCount] = useState(0); // parsed JSON events
  const [ignoredNonGlobalCount, setIgnoredNonGlobalCount] = useState(0);
  const [ignoredNoMessageIdCount, setIgnoredNoMessageIdCount] = useState(0);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [lastEventAt, setLastEventAt] = useState(null);
  const [lastRawEventAt, setLastRawEventAt] = useState(null);
  const [lastThreadSeen, setLastThreadSeen] = useState("");

  const esRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptRef = useRef(0);

  // Token login'den sonra değişebileceği için "bir kere" okumuyoruz.
  const token = localStorage.getItem("token") || "";
  const canSend = Boolean(token);

  const statusText = useMemo(() => {
    if (!isOpen) return "Kapalı";
    return connected ? "Connected" : "Disconnected";
  }, [isOpen, connected]);

  const lastEventText = useMemo(() => {
    if (!lastEventAt) return "—";
    return new Date(lastEventAt).toLocaleTimeString("tr-TR");
  }, [lastEventAt]);

  const lastRawEventText = useMemo(() => {
    if (!lastRawEventAt) return "—";
    return new Date(lastRawEventAt).toLocaleTimeString("tr-TR");
  }, [lastRawEventAt]);

  const reconcileOptimisticUser = (prev, incoming) => {
    // Backend aynı user mesajını SSE ile döndüğünde optimistic mesajı replace et.
    const incomingSender = incoming?.senderType ?? incoming?.SenderType;
    if (incomingSender !== "User") return prev;
    const incomingThread = incoming?.threadId ?? incoming?.ThreadId;
    if (incomingThread !== "global") return prev;
    const incomingText = String(incoming?.text ?? incoming?.Text ?? "").trim();
    if (!incomingText) return prev;

    const idx = prev.findIndex(
      (m) =>
        m?.__localPending &&
        (m?.senderType ?? m?.SenderType) === "User" &&
        (m?.threadId ?? m?.ThreadId) === "global" &&
        String(m?.text ?? m?.Text ?? "").trim() === incomingText
    );
    if (idx === -1) return prev;
    const next = prev.slice();
    next[idx] = incoming;
    return next;
  };

  const scrollToBottom = () => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  useEffect(() => {
    if (!isOpen) return;
    scrollToBottom();
    // panel açılınca input'a odaklan
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    scrollToBottom();
  }, [messages, isOpen]);

  const connectSse = () => {
    if (!isOpen) return;
    if (esRef.current) return; // StrictMode/double effect guard

    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    setConnected(false);
    setSseError("");

    const es = new EventSource(STREAM_URL);
    esRef.current = es;

    es.onopen = () => {
      reconnectAttemptRef.current = 0;
      setConnected(true);
      setSseError("");
    };

    es.onerror = () => {
      setConnected(false);
      setSseError("Disconnected");

      // yeniden bağlanmayı biz yönetelim
      try {
        es.close();
      } catch {
        // ignore
      }
      if (esRef.current === es) esRef.current = null;

      const attempt = (reconnectAttemptRef.current += 1);
      const delays = [1000, 2000, 5000, 10000];
      const delayMs = delays[Math.min(attempt - 1, delays.length - 1)];
      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        connectSse();
      }, delayMs);
    };

    const onMessage = (e) => {
      try {
        const msg = JSON.parse(e.data);

        console.log("📥 SSE message:", msg);

        const threadId = msg?.threadId ?? msg?.ThreadId;
        const messageId = msg?.MessageId ?? msg?.messageId ?? getMessageId(msg);
        const senderType = msg?.senderType ?? msg?.SenderType;

        setRawEventCount((c) => c + 1);
        setLastRawEventAt(Date.now());
        setLastThreadSeen(String(threadId ?? ""));

        if (threadId !== "global") {
          setIgnoredNonGlobalCount((c) => c + 1);
          return;
        }

        if (!messageId) {
          setIgnoredNoMessageIdCount((c) => c + 1);
          return;
        }

        if (seenIdsRef.current.has(messageId)) {
          setDuplicateCount((c) => c + 1);
          return;
        }
        seenIdsRef.current.add(messageId);

        if (senderType && senderType !== "User") {
          // AI cevabı geldi -> typing indicator kapansın
          setAiTyping(false);
        }

        setMessages((prev) => {
          const reconciled = reconcileOptimisticUser(prev, msg);
          if (reconciled !== prev) return reconciled;
          return [...prev, msg];
        });
        setEventCount((c) => c + 1);
        setLastEventAt(Date.now());
        requestAnimationFrame(scrollToBottom);
      } catch (err) {
        console.error("SSE parse error", err, e.data);
      }
    };

    es.addEventListener("message", onMessage);

    // cleanup handler'ı effect'te olacak, burada değil
    es.__onMessage = onMessage;
  };

  useEffect(() => {
    if (!isOpen) {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      setConnected(false);
      return;
    }

    connectSse();

    return () => {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      const es = esRef.current;
      if (es) {
        try {
          if (es.__onMessage) es.removeEventListener("message", es.__onMessage);
        } catch {
          // ignore
        }
        try {
          es.close();
        } catch {
          // ignore
        }
        esRef.current = null;
      }
      setConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const handleToggle = () => setIsOpen((v) => !v);

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    if (!token) return;

    // Optimistic UI: user mesajını anında göster
    const optimistic = {
      MessageId: makeLocalMessageId(),
      threadId: "global",
      senderType: "User",
      text: trimmed,
      createdAtUtc: new Date().toISOString(),
      __localPending: true,
    };
    seenIdsRef.current.add(optimistic.MessageId);
    setMessages((prev) => [...prev, optimistic]);
    requestAnimationFrame(scrollToBottom);
    setAiTyping(true);

    setIsSending(true);
    setSendError("");
    try {
      const res = await fetch(SEND_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          threadId: "global",
          senderType: "User",
          text: trimmed,
        }),
      });

      if (!res.ok) {
        setSendError(`Mesaj gönderilemedi (HTTP ${res.status}).`);
        setAiTyping(false);
        return;
      }

      // NOT: response ile listeye eklemiyoruz (duplicate olur)
      setInputText("");
    } catch (err) {
      setSendError("Mesaj gönderilirken ağ hatası oluştu.");
      setAiTyping(false);
    } finally {
      setIsSending(false);
    }
  };

  const onInputKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <button type="button" className="chatw-btn" onClick={handleToggle} aria-label="Chat aç/kapat">
        <span className="chatw-btn-icon" aria-hidden="true">
          💬
        </span>
        <span className="chatw-btn-text">Chat</span>
      </button>

      {isOpen ? (
        <div className="chatw-panel" role="dialog" aria-label="Chat paneli">
          <div className="chatw-header">
            <div className="chatw-title">
              <div className="chatw-title-row">
                <strong>AIChat</strong>
                <span className="chatw-status">
                  <span
                    className={`chatw-dot ${connected ? "ok" : "err"}`}
                    aria-hidden="true"
                  />
                  <span className={`chatw-pill ${connected ? "ok" : "err"}`}>
                    {statusText}
                  </span>
                </span>
              </div>
            </div>
            <button type="button" className="chatw-close" onClick={handleToggle} aria-label="Kapat">
              ✕
            </button>
          </div>

          {!token ? (
            <div className="chatw-error">JWT yok: Mesaj gönderme kapalı. (localStorage: "token")</div>
          ) : null}
          {sendError ? <div className="chatw-error">{sendError}</div> : null}
          {!connected ? (
            <div className="chatw-error">
              SSE bağlı değilse mesajlar görünmez. `https://localhost:7299/swagger` açıp sertifikayı kabul ettiğinizden
              emin olun ve backend’in çalıştığını kontrol edin.
            </div>
          ) : null}

          <div className="chatw-messages chat-scroll" ref={listRef}>
            {messages.length === 0 ? (
              <div className="chatw-empty">Henüz mesaj yok.</div>
            ) : (
              messages.map((msg) => (
                <ChatMessageBubble key={msg?.MessageId ?? msg?.messageId ?? getMessageId(msg)} message={msg} />
              ))
            )}

            {aiTyping ? (
              <div className="chatw-row ai">
                <div className="chatw-bubble ai chatw-typing">
                  <span>AI yazıyor</span>
                  <span className="chatw-typing-dots" aria-hidden="true">
                    <span className="chatw-typing-dot" />
                    <span className="chatw-typing-dot" />
                    <span className="chatw-typing-dot" />
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="chatw-footer">
            <textarea
              className="chatw-input"
              placeholder="Mesaj yaz…"
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={onInputKeyDown}
              ref={inputRef}
              disabled={!token}
            />
            <button
              type="button"
              className="chatw-send"
              onClick={handleSend}
              disabled={!inputText.trim() || isSending || !canSend}
            >
              {isSending ? (
                <span className="chatw-spinner" aria-label="Gönderiliyor" />
              ) : (
                <>
                  <span className="chatw-send-text">Gönder</span>
                  <span className="chatw-send-icon" aria-hidden="true">
                    ➤
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}


