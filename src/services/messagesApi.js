import messagesApiClient from "../config/messagesApiClient";

export const MessagesApi = {
  async send(payload) {
    const res = await messagesApiClient.post("/api/Messages/send", payload);
    return res.data;
  },

  async getOutbox(employeeId) {
    const res = await messagesApiClient.get("/api/Messages/outbox", {
      params: { employeeId },
    });
    return res.data;
  },

  async getInbox(employeeId) {
    const res = await messagesApiClient.get("/api/Messages/inbox", {
      params: { employeeId },
    });
    return res.data;
  },

  async markInboxRead(id) {
    const res = await messagesApiClient.put(`/api/Messages/inbox/${id}/read`);
    return res.data;
  },
};


