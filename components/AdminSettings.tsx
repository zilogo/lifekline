import React, { useState } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import { logout } from '../utils/configManager';
import { Settings, ArrowLeft, LogOut, Cloud } from 'lucide-react';
import { WORKER_URL } from '../config/workerConfig';

interface AdminSettingsProps {
  onBack: () => void;
}

export default function AdminSettings({ onBack }: AdminSettingsProps) {
  const { apiConfig, updateConfig, clearConfig } = useConfig();

  const [formData, setFormData] = useState({
    modelName: apiConfig?.modelName || ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = () => {
    updateConfig(formData);
    alert('✅ 配置已保存');
  };

  const handleReset = () => {
    if (confirm('确定重置配置？')) {
      clearConfig();
      setFormData({ modelName: '' });
      alert('已重置');
    }
  };

  const handleLogout = () => {
    logout();
    onBack();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">系统配置</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 px-3 py-1"
            >
              <LogOut className="w-4 h-4" />
              退出
            </button>
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              返回
            </button>
          </div>
        </div>

        {/* Cloudflare Worker 说明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Cloud className="w-5 h-5 text-blue-700" />
            <h3 className="font-bold text-blue-900">Cloudflare Workers 部署</h3>
          </div>
          <p className="text-sm text-blue-800 mb-3">
            API Key 已安全保存在 Cloudflare Workers 中，完全不暴露在前端。所有用户自动使用 Worker 中的配置。
          </p>

          <div className="bg-white p-3 rounded border border-blue-300 mb-3">
            <label className="text-xs text-gray-600 block mb-1">Worker URL（只读）</label>
            <code className="text-sm font-mono text-gray-800 break-all">
              {WORKER_URL || '未配置，请联系开发者'}
            </code>
          </div>

          <div className="text-xs text-blue-700 space-y-1">
            <p>• 修改 API Key 或模型：登录 Cloudflare Dashboard → Workers → Settings → Variables</p>
            <p>• 配置更新后立即生效，无需重新部署前端</p>
          </div>
        </div>

        {/* 模型配置 */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">可选配置</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              模型名称（可选）
            </label>
            <input
              type="text"
              name="modelName"
              value={formData.modelName}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="留空使用 Worker 默认配置"
            />
            <p className="text-xs text-gray-500 mt-1">
              如需使用不同的模型，可在此指定（如 DeepSeek-V3、GPT-4 等）
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium"
          >
            保存配置
          </button>
          <button
            onClick={handleReset}
            className="px-6 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 font-medium"
          >
            重置
          </button>
        </div>

        {/* Info */}
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700">
          <p className="font-bold mb-2">安全优势</p>
          <ul className="space-y-1 text-xs">
            <li>✅ API Key 存储在 Cloudflare 环境变量（加密）</li>
            <li>✅ 前端代码中完全看不到 Key</li>
            <li>✅ 网络请求中也不暴露 Key</li>
            <li>✅ 浏览器开发者工具无法获取 Key</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
