import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { getEmployeeIdFromToken } from "../../auth/jwtClaims";
import { MessagesApi } from "../../services/messagesApi";
import { Badge, Button, Chip } from "@mui/material";
import { Box, Tab } from "@mui/material";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Alert } from "@mui/material";

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

function normalizeBool(value) {
  if (value === true || value === false) return value;
  if (value === 1 || value === "1") return true;
  if (value === 0 || value === "0") return false;
  return null;
}

function normalizeMessage(raw) {
  const id = getField(raw, ["id", "messageId", "inboxId", "outboxId"]);
  const subject = getField(raw, ["subject", "title", "topic"]) || "(Konu yok)";
  const body =
    getField(raw, ["body", "message", "content", "text"]) || "";
  const uiBody = getField(raw, ["uiBody", "ui_body"]);
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

  // Inbox read info
  const isRead = normalizeBool(getField(raw, ["isRead"]));
  const readAt = getField(raw, ["readAt"]);
  const outboxId = getField(raw, ["outboxId"]);

  // Outbox read info (receiver side)
  const isReadByReceiver = normalizeBool(getField(raw, ["isReadByReceiver"]));
  const readByReceiverAt = getField(raw, ["readByReceiverAt"]);

  return {
    raw,
    id,
    subject: String(subject),
    body: String(body),
    uiBody: uiBody ? String(uiBody) : null,
    fromEmail: fromEmail ? String(fromEmail) : null,
    toEmail: toEmail ? String(toEmail) : null,
    createDate,
    isRead,
    readAt,
    outboxId,
    isReadByReceiver,
    readByReceiverAt,
  };
}

function MessageModal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <div className="font-semibold text-slate-900 text-sm">{title}</div>
          <Button
            type="button"
            variant="text"
            disableRipple
            onClick={onClose}
            aria-label="Kapat"
            sx={{
              minWidth: 0,
              width: 32,
              height: 32,
              padding: 0,
              borderRadius: 9999,
              textTransform: "none",
              color: "rgba(100, 116, 139, 1)",
              "&:hover": {
                backgroundColor: "rgba(241, 245, 249, 1)",
                color: "rgba(15, 23, 42, 1)",
              },
            }}
          >
            ✕
          </Button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function InboxTabLabel({ unreadCount }) {
  return (
    <Box
      component="span"
      sx={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        pr: unreadCount > 0 ? 2.5 : 0, // badge için sağdan boşluk
      }}
    >
      <span>Gelen Kutusu</span>
      <Badge
        badgeContent={unreadCount}
        color="primary"
        invisible={!unreadCount || unreadCount <= 0}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        sx={{
          position: "absolute",
          top: 2,
          right: 2,
          pointerEvents: "none",
          "& .MuiBadge-badge": {
            fontSize: 11,
            height: 18,
            minWidth: 18,
          },
        }}
      >
        <span style={{ display: "block", width: 1, height: 1 }} />
      </Badge>
    </Box>
  );
}

function ListRow({ msg, rightBadge, onClick, unread = false }) {
  const preview = msg.body.length > 140 ? `${msg.body.slice(0, 140)}…` : msg.body;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick?.();
      }}
      className="w-full text-left border border-slate-200 rounded-lg p-4 hover:shadow-md hover:border-slate-300 transition bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {unread ? (
              <span
                className="inline-block h-2 w-2 rounded-full bg-blue-600"
                aria-label="Okunmadı"
                title="Okunmadı"
              />
            ) : null}
            <div
              className={`truncate ${
                unread ? "font-bold text-slate-900" : "font-semibold text-slate-900"
              }`}
            >
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
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  const [compose, setCompose] = useState({
    toEmployeeId: "",
    toEmail: "",
    subject: "",
    body: "",
  });
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  const canUseApi = employeeId != null;

  const isInboxRead = (m) => {
    if (!m) return false;
    if (m.isRead === true) return true;
    if (m.isRead === false) return false;
    return Boolean(m.readAt);
  };

  const isOutboxReadByReceiver = (m) => {
    if (!m) return false;
    if (m.isReadByReceiver === true) return true;
    if (m.isReadByReceiver === false) return false;
    return Boolean(m.readByReceiverAt);
  };

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
    setDetailError(null);

    if (box !== "inbox") return;
    if (!msg?.id) return;

    // Modal açılınca detayı çek (body template vs.)
    setDetailLoading(true);
    try {
      const detail = await MessagesApi.getInboxMessage(msg.id);
      const normalized = normalizeMessage(detail);
      setSelected((prev) =>
        prev?.msg?.id === msg.id
          ? {
              ...prev,
              msg: {
                ...prev.msg,
                // Detaydan gelen body/konu vb. varsa üzerine yaz
                ...normalized,
              },
            }
          : prev
      );
    } catch (err) {
      setDetailError(
        err?.response?.data?.message ||
          err?.message ||
          "Mesaj detayı alınamadı."
      );
    } finally {
      setDetailLoading(false);
    }

    // Detay geldikten sonra okundu işaretle (receiver side)
    if (isInboxRead(msg)) return; // zaten okundu
    if (markingRead) return;

    setMarkingRead(true);
    const prevIsRead = msg.isRead;
    const prevReadAt = msg.readAt;
    const optimisticReadAt = new Date().toISOString();

    // Optimistic UI
    setInbox((prev) =>
      prev.map((m) =>
        m.id === msg.id ? { ...m, isRead: true, readAt: optimisticReadAt } : m
      )
    );
    setSelected((prev) =>
      prev?.msg?.id === msg.id
        ? { ...prev, msg: { ...prev.msg, isRead: true, readAt: optimisticReadAt } }
        : prev
    );

    try {
      const res = await MessagesApi.markInboxRead(msg.id);

      const serverReadAt =
        getField(res, ["readAt"]) ||
        getField(res?.data, ["readAt"]) ||
        optimisticReadAt;

      setInbox((prev) =>
        prev.map((m) =>
          m.id === msg.id ? { ...m, isRead: true, readAt: serverReadAt } : m
        )
      );
      setSelected((prev) =>
        prev?.msg?.id === msg.id
          ? { ...prev, msg: { ...prev.msg, isRead: true, readAt: serverReadAt } }
          : prev
      );
    } catch (err) {
      // revert optimistic change
      setInbox((prev) =>
        prev.map((m) =>
          m.id === msg.id ? { ...m, isRead: prevIsRead, readAt: prevReadAt } : m
        )
      );
      setSelected((prev) =>
        prev?.msg?.id === msg.id
          ? { ...prev, msg: { ...prev.msg, isRead: prevIsRead, readAt: prevReadAt } }
          : prev
      );
      console.error("Mesaj okundu olarak işaretlenemedi:", err);
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
    () => inbox.filter((m) => !isInboxRead(m)).length,
    [inbox]
  );
  const pendingCount = useMemo(
    () => outbox.filter((m) => !isOutboxReadByReceiver(m)).length,
    [outbox]
  );

  const handleTabChange = (_, newValue) => {
    setTab(newValue);
  };

  return (
    <div className="w-full">
      {showHeader ? (
        <div className="mb-4 flex items-start sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            {onBack ? (
              <Button
                type="button"
                variant="outlined"
                size="small"
                onClick={onBack}
                sx={{ textTransform: "none" }}
              >
                ← Geri
              </Button>
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

          <Button
            type="button"
            variant="outlined"
            size="small"
            onClick={refreshActive}
            disabled={!canUseApi || loading}
            sx={{ textTransform: "none" }}
          >
            Yenile
          </Button>
        </div>
      ) : null}

      {!canUseApi ? (
        <Alert severity="warning">
          Token içinde <span className="font-semibold">employeeId</span> claim’i
          bulunamadı. Listeleme için gerekli.
        </Alert>
      ) : null}

      {error ? (
        <Alert severity="error" className="mt-4">
          {error}
        </Alert>
      ) : null}

      <div className="mt-4">
        <TabContext value={tab}>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <TabList onChange={handleTabChange} aria-label="Mesajlar sekmeleri">
              <Tab
                value="inbox"
                sx={{ textTransform: "none" }}
                label={<InboxTabLabel unreadCount={unreadCount} />}
              />
              <Tab
                value="outbox"
                sx={{ textTransform: "none" }}
                label="Giden Kutusu"
              />
              <Tab value="compose" label="Yeni Mesaj" sx={{ textTransform: "none" }} />
            </TabList>
          </Box>

          <div className="mt-6 bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-6">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600" />
                Yükleniyor…
              </div>
            ) : null}

            <TabPanel value="inbox" sx={{ p: 0 }}>
              {!loading ? (
                <div className="space-y-3">
                  {inbox.length === 0 ? (
                    <div className="text-slate-500 text-center py-10">
                      Gelen kutusu boş.
                    </div>
                  ) : (
                    inbox.map((m, idx) => {
                      const unread = !isInboxRead(m);
                      const readAt = m.readAt;
                      return (
                        <ListRow
                          key={m.id != null ? String(m.id) : `in-${idx}`}
                          msg={m}
                          onClick={() => openMessage("inbox", m)}
                          unread={unread}
                          rightBadge={
                            <div className="text-right">
                              <Chip
                                label={unread ? "Okunmadı" : "Okundu"}
                                color={unread ? "secondary" : "success"}
                                variant={unread ? "outlined" : "filled"}
                                size="small"
                              />
                              {!unread && readAt ? (
                                <div className="mt-1 text-[11px] text-slate-400">
                                  {formatDateTR(readAt)}
                                </div>
                              ) : null}
                            </div>
                          }
                        />
                      );
                    })
                  )}
                </div>
              ) : null}
            </TabPanel>

            <TabPanel value="outbox" sx={{ p: 0 }}>
              {!loading ? (
                <div className="space-y-3">
                  {outbox.length === 0 ? (
                    <div className="text-slate-500 text-center py-10">
                      Giden kutusu boş.
                    </div>
                  ) : (
                    outbox.map((m, idx) => {
                      const read = isOutboxReadByReceiver(m);
                      const readAt = m.readByReceiverAt;
                      return (
                        <ListRow
                          key={m.id != null ? String(m.id) : `out-${idx}`}
                          msg={m}
                          onClick={() => openMessage("outbox", m)}
                          rightBadge={
                            <div className="text-right">
                              <Chip
                                label={read ? "Okundu" : "Gönderildi"}
                                color={read ? "success" : "primary"}
                                size="small"
                              />
                              {read && readAt ? (
                                <div className="mt-1 text-[11px] text-slate-400">
                                  {formatDateTR(readAt)}
                                </div>
                              ) : null}
                            </div>
                          }
                        />
                      );
                    })
                  )}
                </div>
              ) : null}
            </TabPanel>

            <TabPanel value="compose" sx={{ p: 0 }}>
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
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={() =>
                      setCompose({
                        toEmployeeId: "",
                        toEmail: "",
                        subject: "",
                        body: "",
                      })
                    }
                    disabled={sending}
                    sx={{ textTransform: "none" }}
                  >
                    Temizle
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={sending}
                    sx={{ textTransform: "none" }}
                  >
                    {sending ? "Gönderiliyor…" : "Gönder"}
                  </Button>
                </div>
              </form>
            </TabPanel>
          </div>
        </TabContext>
      </div>

      <MessageModal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.box === "inbox" ? "Gelen Mesaj" : "Giden Mesaj"}
      >
        {selected?.msg ? (
          <div className="space-y-3">
            {detailLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600" />
                Mesaj yükleniyor…
              </div>
            ) : null}
            {detailError ? (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
                {detailError}
              </div>
            ) : null}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-base font-bold text-slate-900 break-words">
                  {selected.msg.subject}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {selected.msg.fromEmail ? (
                    <span className="mr-3">Gönderen: {selected.msg.fromEmail}</span>
                  ) : null}
                  {selected.msg.toEmail ? <span>Alıcı: {selected.msg.toEmail}</span> : null}
                </div>
              </div>

              <div className="shrink-0 text-right">
                {selected.box === "inbox" ? (
                  <div>
                    <Chip
                      label={isInboxRead(selected.msg) ? "Okundu" : "Okunmadı"}
                      color={isInboxRead(selected.msg) ? "success" : "secondary"}
                      variant={isInboxRead(selected.msg) ? "filled" : "outlined"}
                      size="small"
                    />
                    {isInboxRead(selected.msg) && selected.msg.readAt ? (
                      <div className="mt-1 text-[11px] text-slate-400">
                        {formatDateTR(selected.msg.readAt)}
                      </div>
                    ) : null}
                    {markingRead && !isInboxRead(selected.msg) ? (
                      <div className="mt-1 text-[11px] text-slate-400">
                        Okundu işaretleniyor…
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div>
                    <Chip
                      label={isOutboxReadByReceiver(selected.msg) ? "Okundu" : "Gönderildi"}
                      color={isOutboxReadByReceiver(selected.msg) ? "success" : "primary"}
                      size="small"
                    />
                    {isOutboxReadByReceiver(selected.msg) && selected.msg.readByReceiverAt ? (
                      <div className="mt-1 text-[11px] text-slate-400">
                        {formatDateTR(selected.msg.readByReceiverAt)}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            <div className="text-xs text-slate-400">
              Oluşturma: {formatDateTR(selected.msg.createDate)}
            </div>

            {selected.msg.uiBody ? (
              <div
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 overflow-auto"
                dangerouslySetInnerHTML={{ __html: selected.msg.uiBody || "" }}
              />
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 whitespace-pre-wrap break-words">
                {selected.msg.body || "(İçerik yok)"}
              </div>
            )}
          </div>
        ) : null}
      </MessageModal>
    </div>
  );
}


