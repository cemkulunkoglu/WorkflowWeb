import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { getEmployeeIdFromToken } from "../../auth/jwtClaims";
import { MessagesApi } from "../../services/messagesApi";

function getField(obj, keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}

function formatDateTR(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("tr-TR");
}

function normalizeMessage(raw) {
  const id = getField(raw, ["id", "messageId", "inboxId", "outboxId"]);
  const subject = getField(raw, ["subject", "title", "topic"]) || "(Konu yok)";
  const body =
    getField(raw, ["body", "message", "content", "text"]) || "";
  const fromEmail = getField(raw, [
    "fromEmail",
    "senderEmail",
    "emailFrom",
    "from",
  ]);
  const toEmail = getField(raw, [
    "toEmail",
    "receiverEmail",
    "emailTo",
    "to",
  ]);
  const createDate = getField(raw, [
    "createDate",
    "createdAt",
    "createTime",
    "createdOn",
  ]);
  const updateDate = getField(raw, [
    "updateDate",
    "updatedAt",
    "updateTime",
    "updatedOn",
  ]);

  return {
    raw,
    id,
    subject: String(subject),
    body: String(body),
    fromEmail: fromEmail ? String(fromEmail) : null,
    toEmail: toEmail ? String(toEmail) : null,
    createDate,
    updateDate,
  };
}

function MessageModal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <div className="font-semibold text-slate-900 text-sm">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function ListRow({ msg, rightBadge, onClick }) {
  const preview = msg.body.length > 140 ? `${msg.body.slice(0, 140)}…` : msg.body;
  return (
    <div
      className="w-full text-left border border-slate-200 rounded-lg p-4 hover:shadow-md hover:border-slate-300 transition bg-white"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-semibold text-slate-900 truncate">
              {msg.subject}
            </div>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {msg.fromEmail ? (
              <span className="mr-3">Gönderen: {msg.fromEmail}</span>
            ) : null}
            {msg.toEmail ? <span>Alıcı: {msg.toEmail}</span> : null}
          </div>
          <div className="mt-2 text-sm text-slate-700 overflow-hidden">
            {preview}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Oluşturma: {formatDateTR(msg.createDate)}
            {msg.updateDate
              ? ` • Güncelleme: ${formatDateTR(msg.updateDate)}`
              : ""}
          </div>
        </div>
        <div className="shrink-0">{rightBadge}</div>
      </div>
    </div>
  );
}

export default function MessagesPanel({ showHeader = false, onBack }) {
  const { token } = useAuth();

  const employeeId = useMemo(() => getEmployeeIdFromToken(token), [token]);

  const [tab, setTab] = useState("inbox"); // inbox | outbox | compose
  const [inbox, setInbox] = useState([]);
  const [outbox, setOutbox] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selected, setSelected] = useState(null); // { box: 'inbox'|'outbox', msg }
  const [markingRead, setMarkingRead] = useState(false);

  const [compose, setCompose] = useState({
    toEmployeeId: "",
    toEmail: "",
    subject: "",
    body: "",
  });
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  const canUseApi = employeeId != null;

  const fetchInbox = async () => {
    if (!canUseApi) return;
    setLoading(true);
    setError(null);
    try {
      const data = await MessagesApi.getInbox(employeeId);
      const list = Array.isArray(data) ? data : [];
      setInbox(list.map(normalizeMessage));
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || "Gelen kutusu alınamadı."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchOutbox = async () => {
    if (!canUseApi) return;
    setLoading(true);
    setError(null);
    try {
      const data = await MessagesApi.getOutbox(employeeId);
      const list = Array.isArray(data) ? data : [];
      setOutbox(list.map(normalizeMessage));
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || "Giden kutusu alınamadı."
      );
    } finally {
      setLoading(false);
    }
  };

  const refreshActive = () => {
    if (tab === "inbox") fetchInbox();
    if (tab === "outbox") fetchOutbox();
  };

  useEffect(() => {
    setError(null);
    setSendResult(null);

    if (!canUseApi) return;
    if (tab === "inbox") fetchInbox();
    if (tab === "outbox") fetchOutbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, canUseApi, employeeId]);

  const openMessage = async (box, msg) => {
    setSelected({ box, msg });

    if (box !== "inbox") return;
    if (!msg?.id) return;
    if (msg.updateDate) return; // zaten okundu

    setMarkingRead(true);
    try {
      await MessagesApi.markInboxRead(msg.id);
      const nowIso = new Date().toISOString();
      setInbox((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, updateDate: nowIso } : m))
      );
      setSelected((prev) =>
        prev?.msg?.id === msg.id
          ? { ...prev, msg: { ...prev.msg, updateDate: nowIso } }
          : prev
      );
    } catch (err) {
      // Okundu işaretleme başarısız olsa da modal açık kalsın.
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Mesaj okundu olarak işaretlenemedi."
      );
    } finally {
      setMarkingRead(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    setSendResult(null);
    try {
      const toEmployeeIdNum =
        compose.toEmployeeId.trim() === "" ? null : Number(compose.toEmployeeId);

      if (toEmployeeIdNum !== null && !Number.isFinite(toEmployeeIdNum)) {
        setError("Alıcı employeeId sayısal olmalıdır.");
        setSending(false);
        return;
      }
      if (!compose.subject.trim() && !compose.body.trim()) {
        setError("Konu veya mesaj içeriği girin.");
        setSending(false);
        return;
      }

      // Backend model ismi farklı olsa bile yakalama şansını artırmak için alias'lar.
      const payload = {
        toEmployeeId: toEmployeeIdNum,
        receiverEmployeeId: toEmployeeIdNum,
        toEmail: compose.toEmail.trim() || null,
        receiverEmail: compose.toEmail.trim() || null,
        subject: compose.subject.trim() || null,
        title: compose.subject.trim() || null,
        body: compose.body.trim() || null,
        message: compose.body.trim() || null,
        content: compose.body.trim() || null,
      };

      const res = await MessagesApi.send(payload);
      setSendResult(res);
      setCompose({ toEmployeeId: "", toEmail: "", subject: "", body: "" });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Mesaj gönderilemedi."
      );
    } finally {
      setSending(false);
    }
  };

  const unreadCount = useMemo(
    () => inbox.filter((m) => !m.updateDate).length,
    [inbox]
  );
  const pendingCount = useMemo(
    () => outbox.filter((m) => !m.updateDate).length,
    [outbox]
  );

  return (
    <div className="w-full">
      {showHeader ? (
        <div className="mb-4 flex items-start sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="px-3 py-2 text-xs sm:text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors duration-200 font-medium"
              >
                ← Geri
              </button>
            ) : null}
            <div>
              <div className="text-sm sm:text-base font-bold text-slate-800">
                Mesajlar
              </div>
              <div className="text-[11px] text-slate-500">
                EmployeeId: {employeeId ?? "-"}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={refreshActive}
            disabled={!canUseApi || loading}
            className="px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors duration-200 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Yenile
          </button>
        </div>
      ) : null}

      {!canUseApi ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm">
          Token içinde <span className="font-semibold">employeeId</span> claim’i
          bulunamadı. Listeleme için gerekli.
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
          {error}
        </div>
      ) : null}

      <div className="mt-4">
        <div className="border-b border-slate-200">
          <nav className="flex gap-6" aria-label="Tabs">
            <button
              type="button"
              onClick={() => setTab("inbox")}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                tab === "inbox"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              Gelen Kutusu{" "}
              {unreadCount > 0 ? (
                <span className="ml-2 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                  {unreadCount} okunmadı
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => setTab("outbox")}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                tab === "outbox"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              Giden Kutusu{" "}
              {pendingCount > 0 ? (
                <span className="ml-2 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
                  {pendingCount} beklemede
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => setTab("compose")}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                tab === "compose"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              Yeni Mesaj
            </button>
          </nav>
        </div>

        <div className="mt-6 bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600" />
              Yükleniyor…
            </div>
          ) : null}

          {tab === "inbox" && !loading ? (
            <div className="space-y-3">
              {inbox.length === 0 ? (
                <div className="text-slate-500 text-center py-10">
                  Gelen kutusu boş.
                </div>
              ) : (
                inbox.map((m, idx) => {
                  const unread = !m.updateDate;
                  return (
                    <ListRow
                      key={m.id != null ? String(m.id) : `in-${idx}`}
                      msg={m}
                      onClick={() => openMessage("inbox", m)}
                      rightBadge={
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold border ${
                            unread
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}
                        >
                          {unread ? "Okunmadı" : "Okundu"}
                        </span>
                      }
                    />
                  );
                })
              )}
            </div>
          ) : null}

          {tab === "outbox" && !loading ? (
            <div className="space-y-3">
              {outbox.length === 0 ? (
                <div className="text-slate-500 text-center py-10">
                  Giden kutusu boş.
                </div>
              ) : (
                outbox.map((m, idx) => {
                  const sent = Boolean(m.updateDate);
                  return (
                    <ListRow
                      key={m.id != null ? String(m.id) : `out-${idx}`}
                      msg={m}
                      onClick={() => openMessage("outbox", m)}
                      rightBadge={
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold border ${
                            sent
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {sent ? "Gönderildi" : "Beklemede"}
                        </span>
                      }
                    />
                  );
                })
              )}
            </div>
          ) : null}

          {tab === "compose" ? (
            <div>
              {sendResult?.id ? (
                <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-800 text-sm">
                  Mesaj kuyruğa alındı. <span className="font-semibold">Id</span>:{" "}
                  {sendResult.id}
                </div>
              ) : null}

              <form onSubmit={handleSend} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Alıcı EmployeeId
                    </label>
                    <input
                      value={compose.toEmployeeId}
                      onChange={(e) =>
                        setCompose((p) => ({ ...p, toEmployeeId: e.target.value }))
                      }
                      placeholder="Örn: 17"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                    />
                    <div className="mt-1 text-[11px] text-slate-500">
                      Filtreleme için employeeId kritik.
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Alıcı Email (opsiyonel)
                    </label>
                    <input
                      value={compose.toEmail}
                      onChange={(e) =>
                        setCompose((p) => ({ ...p, toEmail: e.target.value }))
                      }
                      placeholder="ornek@sirket.com"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Konu
                  </label>
                  <input
                    value={compose.subject}
                    onChange={(e) =>
                      setCompose((p) => ({ ...p, subject: e.target.value }))
                    }
                    placeholder="Konu"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Mesaj
                  </label>
                  <textarea
                    value={compose.body}
                    onChange={(e) =>
                      setCompose((p) => ({ ...p, body: e.target.value }))
                    }
                    placeholder="Mesaj içeriği"
                    rows={6}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCompose({
                        toEmployeeId: "",
                        toEmail: "",
                        subject: "",
                        body: "",
                      })
                    }
                    className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium"
                    disabled={sending}
                  >
                    Temizle
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold disabled:opacity-70 disabled:cursor-not-allowed"
                    disabled={sending}
                  >
                    {sending ? "Gönderiliyor…" : "Gönder"}
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}


