
import React, { useState, useMemo } from 'react';
import { UserInput, Gender, BirthDateTime } from '../types';
import { Loader2, Sparkles, AlertCircle, TrendingUp, Calendar } from 'lucide-react';
import { calculateBazi, validateBirthDateTime } from '../utils/baziCalculator';
import { useConfig } from '../contexts/ConfigContext';
import { isWorkerConfigured } from '../config/workerConfig';

interface BaziFormProps {
  onSubmit: (data: UserInput) => void;
  isLoading: boolean;
}

const BaziForm: React.FC<BaziFormProps> = ({ onSubmit, isLoading }) => {
  const { apiConfig } = useConfig();

  const [formData, setFormData] = useState<UserInput>({
    name: '',
    gender: Gender.MALE,
    birthYear: '',
    yearPillar: '',
    monthPillar: '',
    dayPillar: '',
    hourPillar: '',
    startAge: '',
    firstDaYun: '',
    modelName: '',
    apiBaseUrl: '',
    apiKey: '',
  });

  // New state for auto-calculation
  const [birthDateTime, setBirthDateTime] = useState<BirthDateTime>({
    year: new Date().getFullYear(),
    month: 1,
    day: 1,
    hour: 0,
    minute: 0
  });

  const [calculationMode, setCalculationMode] = useState<'manual' | 'auto'>('manual');
  const [calculatedFields, setCalculatedFields] = useState<Set<string>>(new Set());
  const [calculationError, setCalculationError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePillarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // If user edits a calculated field, mark as manual override
    if (calculatedFields.has(name)) {
      setFormData(prev => ({ ...prev, [name]: value, isManualOverride: true }));
      setCalculationMode('manual');
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleBirthDateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBirthDateTime(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    setCalculationError(null);
  };

  const handleAutoCalculate = () => {
    try {
      // 1. Validate input
      const validation = validateBirthDateTime(birthDateTime);
      if (!validation.valid) {
        setCalculationError(validation.error || '输入无效');
        return;
      }

      // 2. Calculate Bazi
      const calculated = calculateBazi(birthDateTime, formData.gender);

      // 3. Update form data
      setFormData(prev => ({
        ...prev,
        birthYear: birthDateTime.year.toString(),
        yearPillar: calculated.yearPillar,
        monthPillar: calculated.monthPillar,
        dayPillar: calculated.dayPillar,
        hourPillar: calculated.hourPillar,
        startAge: calculated.startAge.toString(),
        firstDaYun: calculated.firstDaYun,
        isManualOverride: false
      }));

      // 4. Mark as auto-calculated
      setCalculatedFields(new Set(['yearPillar', 'monthPillar', 'dayPillar', 'hourPillar', 'startAge', 'firstDaYun']));
      setCalculationMode('auto');
      setCalculationError(null);
    } catch (error) {
      setCalculationError(error instanceof Error ? error.message : '计算失败');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 检查 Worker 是否配置
    if (!isWorkerConfigured()) {
      alert('⚠️ Worker 未配置，请联系开发者');
      return;
    }

    // Worker 已配置，直接提交（modelName 可选）
    const completeData: UserInput = {
      ...formData,
      modelName: apiConfig?.modelName,
      apiBaseUrl: '', // 不再需要，Worker 会处理
      apiKey: ''      // 不再需要，Worker 会处理
    };

    onSubmit(completeData);
  };

  // Calculate direction for UI feedback
  const daYunDirectionInfo = useMemo(() => {
    if (!formData.yearPillar) return '等待输入年柱...';
    
    const firstChar = formData.yearPillar.trim().charAt(0);
    const yangStems = ['甲', '丙', '戊', '庚', '壬'];
    const yinStems = ['乙', '丁', '己', '辛', '癸'];
    
    let isYangYear = true; // default assume Yang if unknown
    if (yinStems.includes(firstChar)) isYangYear = false;
    
    let isForward = false;
    if (formData.gender === Gender.MALE) {
      isForward = isYangYear; // Male Yang = Forward, Male Yin = Backward
    } else {
      isForward = !isYangYear; // Female Yin = Forward, Female Yang = Backward
    }
    
    return isForward ? '顺行 (阳男/阴女)' : '逆行 (阴男/阳女)';
  }, [formData.yearPillar, formData.gender]);

  return (
    <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-serif-sc font-bold text-gray-800 mb-2">八字排盘</h2>
        <p className="text-gray-500 text-sm">请输入四柱与大运信息以生成分析</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* Name & Gender */}
        <div className="grid grid-cols-2 gap-4">
          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">姓名 (可选)</label>
             <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="姓名"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">性别</label>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, gender: Gender.MALE })}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition ${
                  formData.gender === Gender.MALE
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                乾造 (男)
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, gender: Gender.FEMALE })}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition ${
                  formData.gender === Gender.FEMALE
                    ? 'bg-white text-pink-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                坤造 (女)
              </button>
            </div>
          </div>
        </div>

        {/* Birth Date/Time Input Section - NEW */}
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-blue-800 text-sm font-bold">
              <Calendar className="w-4 h-4" />
              <span>出生日期时间 (阳历)</span>
            </div>
            <button
              type="button"
              onClick={handleAutoCalculate}
              className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              <span>自动计算</span>
            </button>
          </div>

          <div className="grid gap-2" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr' }}>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">年</label>
              <input
                type="number"
                name="year"
                min="1900"
                max="2100"
                value={birthDateTime.year}
                onChange={handleBirthDateTimeChange}
                className="w-full px-2 py-1.5 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">月</label>
              <input
                type="number"
                name="month"
                min="1"
                max="12"
                value={birthDateTime.month}
                onChange={handleBirthDateTimeChange}
                className="w-full px-2 py-1.5 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">日</label>
              <input
                type="number"
                name="day"
                min="1"
                max="31"
                value={birthDateTime.day}
                onChange={handleBirthDateTimeChange}
                className="w-full px-2 py-1.5 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">时</label>
              <input
                type="number"
                name="hour"
                min="0"
                max="23"
                value={birthDateTime.hour}
                onChange={handleBirthDateTimeChange}
                className="w-full px-2 py-1.5 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">分</label>
              <input
                type="number"
                name="minute"
                min="0"
                max="59"
                value={birthDateTime.minute}
                onChange={handleBirthDateTimeChange}
                className="w-full px-2 py-1.5 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              />
            </div>
          </div>

          {calculationError && (
            <div className="mt-2 flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{calculationError}</span>
            </div>
          )}

          {calculationMode === 'auto' && !formData.isManualOverride && (
            <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>已自动计算四柱和大运信息</span>
            </div>
          )}
        </div>

        {/* Four Pillars Input (Auto-calculated or Manual) */}
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-amber-800 text-sm font-bold">
              <Sparkles className="w-4 h-4" />
              <span>四柱干支 {calculationMode === 'auto' && !formData.isManualOverride ? '(已自动计算)' : '(手动输入)'}</span>
            </div>
            {formData.isManualOverride && (
              <div className="text-xs text-yellow-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>已手动修改</span>
              </div>
            )}
          </div>
          
          {/* Birth Year Input - Added as requested */}
          <div className="mb-4">
             <label className="block text-xs font-bold text-gray-600 mb-1">出生年份 (阳历)</label>
             <input
                type="number"
                name="birthYear"
                required
                min="1900"
                max="2100"
                value={formData.birthYear}
                onChange={handleChange}
                placeholder="如: 1990"
                className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white font-bold"
              />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-xs font-bold text-gray-600 mb-1">年柱 (Year)</label>
              <input
                type="text"
                name="yearPillar"
                value={formData.yearPillar}
                onChange={handlePillarChange}
                placeholder="如: 甲子"
                className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white text-center font-serif-sc font-bold"
              />
              {calculatedFields.has('yearPillar') && !formData.isManualOverride && (
                <span className="absolute top-1 right-1 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded">自动</span>
              )}
            </div>
            <div className="relative">
              <label className="block text-xs font-bold text-gray-600 mb-1">月柱 (Month)</label>
              <input
                type="text"
                name="monthPillar"
                value={formData.monthPillar}
                onChange={handlePillarChange}
                placeholder="如: 丙寅"
                className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white text-center font-serif-sc font-bold"
              />
              {calculatedFields.has('monthPillar') && !formData.isManualOverride && (
                <span className="absolute top-1 right-1 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded">自动</span>
              )}
            </div>
            <div className="relative">
              <label className="block text-xs font-bold text-gray-600 mb-1">日柱 (Day)</label>
              <input
                type="text"
                name="dayPillar"
                value={formData.dayPillar}
                onChange={handlePillarChange}
                placeholder="如: 戊辰"
                className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white text-center font-serif-sc font-bold"
              />
              {calculatedFields.has('dayPillar') && !formData.isManualOverride && (
                <span className="absolute top-1 right-1 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded">自动</span>
              )}
            </div>
            <div className="relative">
              <label className="block text-xs font-bold text-gray-600 mb-1">时柱 (Hour)</label>
              <input
                type="text"
                name="hourPillar"
                value={formData.hourPillar}
                onChange={handlePillarChange}
                placeholder="如: 壬戌"
                className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white text-center font-serif-sc font-bold"
              />
              {calculatedFields.has('hourPillar') && !formData.isManualOverride && (
                <span className="absolute top-1 right-1 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded">自动</span>
              )}
            </div>
          </div>
        </div>

        {/* Da Yun Input (Auto-calculated or Manual) */}
        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
          <div className="flex items-center gap-2 mb-3 text-indigo-800 text-sm font-bold">
            <TrendingUp className="w-4 h-4" />
            <span>大运排盘信息 {calculationMode === 'auto' && !formData.isManualOverride ? '(已自动计算)' : '(手动输入)'}</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-xs font-bold text-gray-600 mb-1">起运年龄 (虚岁)</label>
              <input
                type="number"
                name="startAge"
                min="1"
                max="100"
                value={formData.startAge}
                onChange={handlePillarChange}
                placeholder="如: 3"
                className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-center font-bold"
              />
              {calculatedFields.has('startAge') && !formData.isManualOverride && (
                <span className="absolute top-1 right-1 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded">自动</span>
              )}
            </div>
            <div className="relative">
              <label className="block text-xs font-bold text-gray-600 mb-1">第一步大运</label>
              <input
                type="text"
                name="firstDaYun"
                value={formData.firstDaYun}
                onChange={handlePillarChange}
                placeholder="如: 丁卯"
                className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-center font-serif-sc font-bold"
              />
              {calculatedFields.has('firstDaYun') && !formData.isManualOverride && (
                <span className="absolute top-1 right-1 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded">自动</span>
              )}
            </div>
          </div>
           <p className="text-xs text-indigo-600/70 mt-2 text-center">
             当前大运排序规则：
             <span className="font-bold text-indigo-900">{daYunDirectionInfo}</span>
          </p>
        </div>

        {/* Worker Config Warning */}
        {!isWorkerConfigured() && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>⚠️ Worker 未配置，请联系开发者</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !isWorkerConfigured()}
          className="w-full bg-gradient-to-r from-indigo-900 to-gray-900 hover:from-black hover:to-black text-white font-bold py-3.5 rounded-xl shadow-lg transform transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin h-5 w-5" />
              <span>大师推演中(3-5分钟)</span>
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5 text-amber-300" />
              <span>生成人生K线</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default BaziForm;
