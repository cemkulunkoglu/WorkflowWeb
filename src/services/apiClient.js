import { authStorage } from "../auth/authStorage";

async function readJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Basit fetch wrapper:
 * - Token varsa Authorization ekler
 * - 401: token temizle + /login
 * - 403 + {code:"ACCOUNT_NOT_VERIFIED"}: /change-password
 */
export async function apiFetch(baseUrl, path, { method = "GET", headers, body } = {}) {
  const token = authStorage.getToken();

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    authStorage.clearAll();
    window.location.assign("/login");
    throw new Error("Oturum süresi doldu. Lütfen tekrar giriş yapın.");
  }

  if (res.status === 403) {
    const data = await readJsonSafe(res);
    if (data?.code === "ACCOUNT_NOT_VERIFIED") {
      window.location.assign("/change-password");
      throw new Error("Hesap doğrulanmadı. Şifre değiştirmeniz gerekiyor.");
    }
    throw new Error(data?.message || "Yetkisiz işlem (403).");
  }

  if (!res.ok) {
    const data = await readJsonSafe(res);
    throw new Error(data?.message || `İstek başarısız (HTTP ${res.status}).`);
  }

  return await readJsonSafe(res);
}


