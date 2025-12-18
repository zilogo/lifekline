import { Solar, Lunar } from 'lunar-javascript';
import { Gender, BirthDateTime, CalculatedBazi } from '../types';

// Constants for Da Yun calculation
const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/**
 * Calculate four pillars (年月日时柱) from solar date/time
 */
export function calculateFourPillars(birthDate: BirthDateTime): {
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string;
} {
  const { year, month, day, hour, minute = 0 } = birthDate;

  // Create Solar object from lunar-javascript
  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
  const lunar = solar.getLunar();

  // Extract pillars from lunar object
  const yearPillar = lunar.getYearInGanZhi();      // 年柱
  const monthPillar = lunar.getMonthInGanZhi();    // 月柱
  const dayPillar = lunar.getDayInGanZhi();        // 日柱
  const hourPillar = lunar.getTimeInGanZhi();      // 时柱

  return {
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar
  };
}

/**
 * Calculate starting age (起运年龄) based on gender and birth date
 * Traditional method: count days to next solar term, divide by 3
 */
export function calculateStartAge(
  birthDate: BirthDateTime,
  gender: Gender,
  yearStemPolarity: 'YANG' | 'YIN'
): number {
  const { year, month, day, hour = 0, minute = 0 } = birthDate;
  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
  const lunar = solar.getLunar();

  // Determine if forward or backward
  const isForward = (gender === Gender.MALE && yearStemPolarity === 'YANG') ||
                   (gender === Gender.FEMALE && yearStemPolarity === 'YIN');

  // Get the relevant solar term (next term if forward, previous if backward)
  const jieQiTable = lunar.getJieQiTable();

  // Get all jie (节) terms (excluding qi terms)
  const jieTerms = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒'];

  let targetTerm: Solar | null = null;
  let minDaysDiff = Infinity;

  // Find the closest jie term based on direction
  for (const termName of jieTerms) {
    if (jieQiTable[termName]) {
      const termDate = jieQiTable[termName];
      const daysDiff = solar.subtract(termDate);

      if (isForward) {
        // Looking for next term (negative diff means term is in future)
        if (daysDiff < 0 && Math.abs(daysDiff) < minDaysDiff) {
          minDaysDiff = Math.abs(daysDiff);
          targetTerm = termDate;
        }
      } else {
        // Looking for previous term (positive diff means term is in past)
        if (daysDiff > 0 && daysDiff < minDaysDiff) {
          minDaysDiff = daysDiff;
          targetTerm = termDate;
        }
      }
    }
  }

  // If no appropriate term found, use a default distance
  let daysDiffValue = minDaysDiff !== Infinity ? minDaysDiff : 15;

  // Traditional formula: 3 days = 1 year
  const startAge = Math.ceil(daysDiffValue / 3);

  // Ensure minimum 1 year, maximum 10 years (typical range)
  return Math.max(1, Math.min(10, startAge));
}

/**
 * Get stem polarity for direction calculation
 */
export function getStemPolarity(pillar: string): 'YANG' | 'YIN' {
  if (!pillar) return 'YANG';
  const firstChar = pillar.trim().charAt(0);
  const yangStems = ['甲', '丙', '戊', '庚', '壬'];
  const yinStems = ['乙', '丁', '己', '辛', '癸'];

  if (yangStems.includes(firstChar)) return 'YANG';
  if (yinStems.includes(firstChar)) return 'YIN';
  return 'YANG';
}

/**
 * Calculate first Da Yun based on month pillar and direction
 */
export function calculateFirstDaYun(
  monthPillar: string,
  gender: Gender,
  yearStemPolarity: 'YANG' | 'YIN'
): string {
  // Determine direction
  const isForward = (gender === Gender.MALE && yearStemPolarity === 'YANG') ||
                   (gender === Gender.FEMALE && yearStemPolarity === 'YIN');

  // Parse month pillar into stem + branch indices
  const stem = monthPillar.charAt(0);
  const branch = monthPillar.charAt(1);

  const stemIndex = HEAVENLY_STEMS.indexOf(stem);
  const branchIndex = EARTHLY_BRANCHES.indexOf(branch);

  if (stemIndex === -1 || branchIndex === -1) {
    throw new Error(`Invalid month pillar: ${monthPillar}`);
  }

  // Calculate next Da Yun indices
  let newStemIndex: number;
  let newBranchIndex: number;

  if (isForward) {
    newStemIndex = (stemIndex + 1) % 10;
    newBranchIndex = (branchIndex + 1) % 12;
  } else {
    newStemIndex = (stemIndex - 1 + 10) % 10;
    newBranchIndex = (branchIndex - 1 + 12) % 12;
  }

  return HEAVENLY_STEMS[newStemIndex] + EARTHLY_BRANCHES[newBranchIndex];
}

/**
 * Main function: Calculate complete Bazi from birth date/time
 */
export function calculateBazi(
  birthDate: BirthDateTime,
  gender: Gender
): CalculatedBazi {
  try {
    // Step 1: Calculate four pillars
    const pillars = calculateFourPillars(birthDate);

    // Step 2: Determine year stem polarity
    const yearStemPolarity = getStemPolarity(pillars.yearPillar);

    // Step 3: Calculate starting age
    const startAge = calculateStartAge(birthDate, gender, yearStemPolarity);

    // Step 4: Calculate first Da Yun
    const firstDaYun = calculateFirstDaYun(pillars.monthPillar, gender, yearStemPolarity);

    return {
      ...pillars,
      startAge,
      firstDaYun
    };
  } catch (error) {
    console.error('Bazi calculation error:', error);
    throw new Error(`八字计算失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * Validate birth date/time
 */
export function validateBirthDateTime(birthDate: BirthDateTime): {
  valid: boolean;
  error?: string;
} {
  const { year, month, day, hour, minute = 0 } = birthDate;

  if (year < 1900 || year > 2100) {
    return { valid: false, error: '年份必须在 1900-2100 之间' };
  }

  if (month < 1 || month > 12) {
    return { valid: false, error: '月份必须在 1-12 之间' };
  }

  if (day < 1 || day > 31) {
    return { valid: false, error: '日期必须在 1-31 之间' };
  }

  if (hour < 0 || hour > 23) {
    return { valid: false, error: '小时必须在 0-23 之间' };
  }

  if (minute < 0 || minute > 59) {
    return { valid: false, error: '分钟必须在 0-59 之间' };
  }

  // Validate actual date exists
  try {
    const date = new Date(year, month - 1, day, hour, minute);
    if (date.getMonth() !== month - 1) {
      return { valid: false, error: '无效的日期（如 2月30日）' };
    }
  } catch (error) {
    return { valid: false, error: '日期格式错误' };
  }

  return { valid: true };
}
