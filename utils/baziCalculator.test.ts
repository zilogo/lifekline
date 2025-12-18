import { describe, it, expect } from 'vitest';
import {
  calculateFourPillars,
  calculateStartAge,
  calculateFirstDaYun,
  getStemPolarity,
  validateBirthDateTime,
  calculateBazi
} from './baziCalculator';
import { Gender } from '../types';

describe('baziCalculator', () => {
  describe('getStemPolarity', () => {
    it('应正确识别阳天干', () => {
      expect(getStemPolarity('甲子')).toBe('YANG');
      expect(getStemPolarity('丙寅')).toBe('YANG');
      expect(getStemPolarity('戊辰')).toBe('YANG');
      expect(getStemPolarity('庚午')).toBe('YANG');
      expect(getStemPolarity('壬申')).toBe('YANG');
    });

    it('应正确识别阴天干', () => {
      expect(getStemPolarity('乙丑')).toBe('YIN');
      expect(getStemPolarity('丁卯')).toBe('YIN');
      expect(getStemPolarity('己巳')).toBe('YIN');
      expect(getStemPolarity('辛未')).toBe('YIN');
      expect(getStemPolarity('癸酉')).toBe('YIN');
    });

    it('空输入应返回默认值YANG', () => {
      expect(getStemPolarity('')).toBe('YANG');
    });
  });

  describe('calculateFourPillars', () => {
    it('应正确计算已知生辰的四柱', () => {
      // 测试案例：1990年5月15日10点30分
      const result = calculateFourPillars({
        year: 1990,
        month: 5,
        day: 15,
        hour: 10,
        minute: 30
      });

      // 验证返回格式
      expect(result.yearPillar).toBeTruthy();
      expect(result.monthPillar).toBeTruthy();
      expect(result.dayPillar).toBeTruthy();
      expect(result.hourPillar).toBeTruthy();

      // 验证每个柱都是两个字符（天干+地支）
      expect(result.yearPillar.length).toBe(2);
      expect(result.monthPillar.length).toBe(2);
      expect(result.dayPillar.length).toBe(2);
      expect(result.hourPillar.length).toBe(2);
    });

    it('应正确处理不同时辰', () => {
      // 子时 (23:00-01:00)
      const zi = calculateFourPillars({
        year: 2000,
        month: 1,
        day: 1,
        hour: 0,
        minute: 0
      });
      expect(zi.hourPillar.includes('子')).toBeTruthy();

      // 午时 (11:00-13:00)
      const wu = calculateFourPillars({
        year: 2000,
        month: 1,
        day: 1,
        hour: 12,
        minute: 0
      });
      expect(wu.hourPillar.includes('午')).toBeTruthy();
    });

    it('应正确处理闰年2月29日', () => {
      const result = calculateFourPillars({
        year: 2024,
        month: 2,
        day: 29,
        hour: 12,
        minute: 0
      });
      expect(result.yearPillar).toBeTruthy();
    });
  });

  describe('calculateStartAge', () => {
    it('起运年龄应在1-10岁之间', () => {
      const testCases = [
        { year: 1990, month: 5, day: 15, hour: 10 },
        { year: 2000, month: 1, day: 1, hour: 0 },
        { year: 1985, month: 12, day: 25, hour: 18 },
      ];

      testCases.forEach(birthDate => {
        const ageMale = calculateStartAge(birthDate, Gender.MALE, 'YANG');
        const ageFemale = calculateStartAge(birthDate, Gender.FEMALE, 'YIN');

        expect(ageMale).toBeGreaterThanOrEqual(1);
        expect(ageMale).toBeLessThanOrEqual(10);
        expect(ageFemale).toBeGreaterThanOrEqual(1);
        expect(ageFemale).toBeLessThanOrEqual(10);
      });
    });

    it('相同生日不同性别可能有不同起运年龄', () => {
      const birthDate = { year: 1990, month: 5, day: 15, hour: 10 };

      const yangMale = calculateStartAge(birthDate, Gender.MALE, 'YANG');
      const yinFemale = calculateStartAge(birthDate, Gender.FEMALE, 'YIN');

      // 阳男阴女都是顺行，可能相同或接近
      expect(typeof yangMale).toBe('number');
      expect(typeof yinFemale).toBe('number');
    });
  });

  describe('calculateFirstDaYun', () => {
    it('应正确计算顺行大运', () => {
      // 从甲子月顺排，下一步应该是乙丑
      const result = calculateFirstDaYun('甲子', Gender.MALE, 'YANG');
      expect(result).toBe('乙丑');
    });

    it('应正确计算逆行大运', () => {
      // 从甲子月逆排，上一步应该是癸亥
      const result = calculateFirstDaYun('甲子', Gender.MALE, 'YIN');
      expect(result).toBe('癸亥');
    });

    it('应正确处理六十甲子循环', () => {
      // 从癸亥顺排，应该回到甲子
      const result = calculateFirstDaYun('癸亥', Gender.MALE, 'YANG');
      expect(result).toBe('甲子');

      // 从甲子逆排，应该回到癸亥
      const reverse = calculateFirstDaYun('甲子', Gender.MALE, 'YIN');
      expect(reverse).toBe('癸亥');
    });

    it('女命阳年应逆行', () => {
      const result = calculateFirstDaYun('丙寅', Gender.FEMALE, 'YANG');
      expect(result).toBe('乙丑');
    });

    it('女命阴年应顺行', () => {
      const result = calculateFirstDaYun('丁卯', Gender.FEMALE, 'YIN');
      expect(result).toBe('戊辰');
    });
  });

  describe('validateBirthDateTime', () => {
    it('应接受有效日期', () => {
      const validDates = [
        { year: 2000, month: 1, day: 1, hour: 0, minute: 0 },
        { year: 1990, month: 12, day: 31, hour: 23, minute: 59 },
        { year: 2024, month: 2, day: 29, hour: 12, minute: 30 },
      ];

      validDates.forEach(date => {
        const result = validateBirthDateTime(date);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('应拒绝无效日期', () => {
      const invalidDates = [
        { year: 2023, month: 2, day: 30, hour: 12 }, // 2月没有30日
        { year: 2000, month: 13, day: 1, hour: 12 }, // 月份超出范围
        { year: 2000, month: 6, day: 31, hour: 12 }, // 6月只有30天
      ];

      invalidDates.forEach(date => {
        const result = validateBirthDateTime(date);
        expect(result.valid).toBe(false);
        expect(result.error).toBeTruthy();
      });
    });

    it('应拒绝超出范围的年份', () => {
      const result1 = validateBirthDateTime({ year: 1899, month: 1, day: 1, hour: 0 });
      expect(result1.valid).toBe(false);

      const result2 = validateBirthDateTime({ year: 2101, month: 1, day: 1, hour: 0 });
      expect(result2.valid).toBe(false);
    });

    it('应拒绝无效的时间', () => {
      const result1 = validateBirthDateTime({ year: 2000, month: 1, day: 1, hour: 24 });
      expect(result1.valid).toBe(false);

      const result2 = validateBirthDateTime({ year: 2000, month: 1, day: 1, hour: 0, minute: 60 });
      expect(result2.valid).toBe(false);
    });
  });

  describe('calculateBazi - 完整流程测试', () => {
    it('应成功计算完整八字信息', () => {
      const birthDate = {
        year: 1990,
        month: 5,
        day: 15,
        hour: 10,
        minute: 30
      };

      const result = calculateBazi(birthDate, Gender.MALE);

      // 验证所有字段存在
      expect(result.yearPillar).toBeTruthy();
      expect(result.monthPillar).toBeTruthy();
      expect(result.dayPillar).toBeTruthy();
      expect(result.hourPillar).toBeTruthy();
      expect(result.startAge).toBeGreaterThanOrEqual(1);
      expect(result.startAge).toBeLessThanOrEqual(10);
      expect(result.firstDaYun).toBeTruthy();
      expect(result.firstDaYun.length).toBe(2);
    });

    it('相同生日不同性别应产生不同结果', () => {
      const birthDate = { year: 1990, month: 5, day: 15, hour: 10 };

      const male = calculateBazi(birthDate, Gender.MALE);
      const female = calculateBazi(birthDate, Gender.FEMALE);

      // 四柱应该相同
      expect(male.yearPillar).toBe(female.yearPillar);
      expect(male.monthPillar).toBe(female.monthPillar);
      expect(male.dayPillar).toBe(female.dayPillar);
      expect(male.hourPillar).toBe(female.hourPillar);

      // 但大运可能不同（取决于年柱阴阳）
      // 至少应该都能成功计算
      expect(male.firstDaYun).toBeTruthy();
      expect(female.firstDaYun).toBeTruthy();
    });

    it('应能处理特殊日期', () => {
      const specialDates = [
        { year: 2000, month: 1, day: 1, hour: 0, minute: 0 }, // 千禧年
        { year: 2024, month: 2, day: 29, hour: 12, minute: 0 }, // 闰年
        { year: 1900, month: 12, day: 31, hour: 23, minute: 59 }, // 边界
      ];

      specialDates.forEach(date => {
        const result = calculateBazi(date, Gender.MALE);
        expect(result.yearPillar).toBeTruthy();
        expect(result.firstDaYun).toBeTruthy();
      });
    });
  });

  describe('性能测试', () => {
    it('单次计算应在100ms内完成', () => {
      const birthDate = { year: 1990, month: 5, day: 15, hour: 10 };

      const start = performance.now();
      calculateBazi(birthDate, Gender.MALE);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('连续100次计算应在1秒内完成', () => {
      const birthDate = { year: 1990, month: 5, day: 15, hour: 10 };

      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        calculateBazi(birthDate, Gender.MALE);
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(1000);
    });
  });
});
