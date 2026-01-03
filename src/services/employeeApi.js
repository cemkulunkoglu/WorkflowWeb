import workflowApiClient from '../config/workflowApiClient'

const BASE = '/api/employees'

export async function getTree() {
  const response = await workflowApiClient.get(`${BASE}/tree`)
  return response.data
}

export async function getDetail(employeeId) {
  const response = await workflowApiClient.get(`${BASE}/detail/${employeeId}`)
  return response.data
}

export async function updateEmployee(employeeId, payload) {
  const response = await workflowApiClient.put(`${BASE}/update/${employeeId}`, payload)
  return response.data
}

export async function deleteEmployee(employeeId) {
  const response = await workflowApiClient.delete(`${BASE}/delete/${employeeId}`)
  return response.data
}

// EmployeeAncestorDto:
// { employeeId, fullName, jobTitle?, department?, managerId?, path?, level }
export async function getEmployeeAncestors(employeeId, depth = 10, includeSelf = false) {
  const response = await workflowApiClient.get(`${BASE}/${employeeId}/ancestors`, {
    params: {
      depth,
      includeSelf,
    },
  })
  return response.data
}


