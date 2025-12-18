// 测试环境初始化
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// 每个测试后清理
afterEach(() => {
  cleanup();
});
