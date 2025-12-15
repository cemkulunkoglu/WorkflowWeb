// Yardımcı fonksiyonlar: id üretimi, saat formatlama

export function generateMessageId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function formatMessageTime(dateLike) {
  try {
    const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}


