import messagesApiClient from "../config/messagesApiClient";

export const MessagesApi = {
  async send(payload) {
    const res = await messagesApiClient.post("/api/messages/send", payload);
    return res.data;
  },

  async getOutbox(employeeId) {
    const res = await messagesApiClient.get("/api/messages/outbox", {
      params: { employeeId },
    });
    return res.data;
  },

  async getInbox(employeeId) {
    const res = await messagesApiClient.get("/api/messages/inbox", {
      params: { employeeId },
    });
    return res.data;
  },

  async getInboxMessage(id) {
    const res = await messagesApiClient.get(`/api/messages/inbox/${id}`);
    return res.data;
  },

  async markInboxRead(id) {
    const res = await messagesApiClient.put(`/api/messages/inbox/${id}/read`);
    return res.data;
  },
};


