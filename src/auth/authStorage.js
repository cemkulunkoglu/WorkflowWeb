import { TOKEN_KEY, USER_KEY } from "../config/apiConfig";

function readJson(storage, key) {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export const authStorage = {
  getToken() {
    return (
      localStorage.getItem(TOKEN_KEY) ||
      sessionStorage.getItem(TOKEN_KEY) ||
      localStorage.getItem("token") || // legacy
      sessionStorage.getItem("token") || // legacy
      ""
    );
  },

  setToken(token, rememberMe) {
    // önce her iki storage’dan temizleyelim
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");

    const target = rememberMe ? localStorage : sessionStorage;
    target.setItem(TOKEN_KEY, token);
    target.setItem("token", token); // EmployeeTree/legacy key bekleyen yerler için
  },

  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
  },

  getUser() {
    return readJson(localStorage, USER_KEY) || readJson(sessionStorage, USER_KEY);
  },

  setUser(user, rememberMe) {
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(USER_KEY);
    const target = rememberMe ? localStorage : sessionStorage;
    target.setItem(USER_KEY, JSON.stringify(user));
  },

  clearUser() {
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(USER_KEY);
  },

  clearAll() {
    this.clearToken();
    this.clearUser();
  },
};


