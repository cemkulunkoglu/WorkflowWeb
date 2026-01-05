import { jwtDecode } from "jwt-decode";

function readClaim(decoded, keys) {
  for (const k of keys) {
    const v = decoded?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}

export function getEmployeeIdFromToken(token) {
  if (!token) return null;
  try {
    const decoded = jwtDecode(token);

    const raw = readClaim(decoded, [
      "employeeId",
      "EmployeeId",
      "employee_id",
      "empId",
      "EmpId",
    ]);

    if (raw == null) return null;

    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function getEmailFromToken(token) {
  if (!token) return null;
  try {
    const decoded = jwtDecode(token);
    const raw = readClaim(decoded, [
      "email",
      "Email",
      "mail",
      "upn",
      "preferred_username",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
    ]);
    return raw ? String(raw) : null;
  } catch {
    return null;
  }
}


