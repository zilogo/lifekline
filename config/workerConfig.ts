/**
 * Cloudflare Worker 配置
 *
 * 部署 Worker 后，将生成的 Worker URL 更新到这里
 * 格式：https://lifekline-ai-proxy.你的子域名.workers.dev
 *
 * 本地测试：http://localhost:8787
 */
export const WORKER_URL = 'http://localhost:8787';

/**
 * 检查 Worker 是否已配置
 */
export function isWorkerConfigured(): boolean {
  return WORKER_URL.trim().length > 0 &&
         (WORKER_URL.startsWith('https://') || WORKER_URL.startsWith('http://localhost'));
}
