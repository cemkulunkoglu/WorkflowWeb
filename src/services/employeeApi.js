import axiosClient from '../config/axiosClient'

const BASE = '/api/employees'

export async function getTree() {
  const response = await axiosClient.get(`${BASE}/tree`)
  return response.data
}

export async function getDetail(employeeId) {
  const response = await axiosClient.get(`${BASE}/detail/${employeeId}`)
  return response.data
}

export async function createEmployee(payload) {
  const response = await axiosClient.post(`${BASE}/create`, payload)
  return response.data
}

export async function updateEmployee(employeeId, payload) {
  const response = await axiosClient.put(`${BASE}/update/${employeeId}`, payload)
  return response.data
}

export async function deleteEmployee(employeeId) {
  const response = await axiosClient.delete(`${BASE}/delete/${employeeId}`)
  return response.data
}


