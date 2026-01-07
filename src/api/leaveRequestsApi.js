import workflowApiClient from "../config/workflowApiClient";

const BASE = "/api/LeaveRequests";

function pick(obj, keys) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

function normalizeLeaveRequest(raw) {
  const leaveRequestId = pick(raw, ["LeaveRequestId", "leaveRequestId", "id", "Id"]);
  const startDate = pick(raw, ["StartDate", "startDate", "startDateUtc", "StartDateUtc"]);
  const endDate = pick(raw, ["EndDate", "endDate", "endDateUtc", "EndDateUtc"]);
  const dayCount = pick(raw, ["DayCount", "dayCount", "days", "Days"]);
  const reason = pick(raw, ["Reason", "reason", "description", "Description"]) || "";
  const status = pick(raw, ["Status", "status", "state", "State"]);
  const createdAtUtc = pick(raw, ["CreatedAtUtc", "createdAtUtc", "CreatedAt", "createdAt"]);

  return {
    LeaveRequestId: leaveRequestId,
    StartDate: startDate,
    EndDate: endDate,
    DayCount: dayCount,
    Reason: reason,
    Status: status,
    CreatedAtUtc: createdAtUtc,
    _raw: raw,
  };
}

export const LeaveRequestsApi = {
  async getMyLeaveRequests() {
    const res = await workflowApiClient.get(`${BASE}/mine`);
    const data = res.data;
    const list = Array.isArray(data) ? data : data?.items || data?.data || [];
    return Array.isArray(list) ? list.map(normalizeLeaveRequest) : [];
  },

  async createLeaveRequest(payload) {
    // payload: { startDate, endDate, reason }
    const res = await workflowApiClient.post(`${BASE}/create`, payload);
    return res.data;
  },
};


