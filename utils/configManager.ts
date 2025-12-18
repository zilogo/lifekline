const STORAGE_KEYS = {
  API_CONFIG: 'lifekline_api_config',
  ADMIN_AUTH: 'lifekline_admin_auth'
};

// 硬编码认证信息
const ADMIN_CREDENTIALS = {
  username: 'laiye',
  password: 'laiye123'
};

export interface APIConfig {
  modelName?: string;  // 可选，不填则使用 Worker 默认配置
}

// API 配置管理
export function getAPIConfig(): APIConfig | null {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.API_CONFIG);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to load API config:', error);
    return null;
  }
}

export function saveAPIConfig(config: APIConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.API_CONFIG, JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save API config:', error);
    throw new Error('配置保存失败');
  }
}

export function clearAPIConfig(): void {
  localStorage.removeItem(STORAGE_KEYS.API_CONFIG);
}

// 认证管理
export function login(username: string, password: string): boolean {
  if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    localStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, 'true');
    return true;
  }
  return false;
}

export function isAuthenticated(): boolean {
  return localStorage.getItem(STORAGE_KEYS.ADMIN_AUTH) === 'true';
}

export function logout(): void {
  localStorage.removeItem(STORAGE_KEYS.ADMIN_AUTH);
}
