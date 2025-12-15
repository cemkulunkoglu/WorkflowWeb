const AUTH_BASE_URL = import.meta.env.VITE_AUTH_API_URL || 'https://localhost:7130/api/Auth';
const WORKFLOW_BASE_URL = import.meta.env.VITE_WORKFLOW_API_URL || 'https://localhost:7071/api/WorkflowEngine';

export const API_ROUTES = {
  AUTH: {
    LOGIN: `${AUTH_BASE_URL}/login`,
    REGISTER: `${AUTH_BASE_URL}/register`,
  },
  WORKFLOW: {
    GET_ALL: `${WORKFLOW_BASE_URL}/flow-designs`,
    GET_BY_ID: (id) => `${WORKFLOW_BASE_URL}/flow-design/${id}`,
    CREATE: `${WORKFLOW_BASE_URL}/flow-design/create`,
    UPDATE: (id) => `${WORKFLOW_BASE_URL}/flow-design/update/${id}`,
    DELETE: (id) => `${WORKFLOW_BASE_URL}/flow-design/delete/${id}`,
  },
};

export const TOKEN_KEY = 'auth_token';
export const USER_KEY = 'auth_user';
export const STORAGE_FLOW_ID_KEY = 'notes-flow-id';