import authApiClient from "../config/authApiClient";

async function readJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export const AuthService = {
  async login({ userNameOrEmail, password }) {
    const res = await authApiClient.post("/api/Auth/login", { userNameOrEmail, password });
    return res.data;
  },

  async changePassword({ currentPassword, newPassword }) {
    const res = await authApiClient.post("/api/Account/change-password", { currentPassword, newPassword });
    return res.data;
  },

  async provisionEmployee(payload) {
    const res = await authApiClient.post("/api/Auth/provision-employee", payload);
    return res.data;
  },
};


