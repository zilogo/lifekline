import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAPIConfig, saveAPIConfig, clearAPIConfig, APIConfig } from '../utils/configManager';

interface ConfigContextType {
  apiConfig: APIConfig | null;
  updateConfig: (config: APIConfig) => void;
  clearConfig: () => void;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [apiConfig, setApiConfig] = useState<APIConfig | null>(null);

  useEffect(() => {
    // 从 localStorage 读取配置
    setApiConfig(getAPIConfig());
  }, []);

  const updateConfig = (config: APIConfig) => {
    saveAPIConfig(config);
    setApiConfig(config);
  };

  const clearConfig = () => {
    clearAPIConfig();
    setApiConfig(null);
  };

  return (
    <ConfigContext.Provider value={{ apiConfig, updateConfig, clearConfig }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) throw new Error('useConfig must be used within ConfigProvider');
  return context;
}
