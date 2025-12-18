# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Life K-Line (人生K线) is a React-based web application that visualizes a person's life fortune using candlestick (K-line) charts, combining traditional Chinese Bazi (八字) astrology with financial visualization techniques. The application uses AI models (primarily Gemini) to generate detailed life destiny analysis and forecast based on user-provided Four Pillars (四柱干支) and Da Yun (大运) information.

## Technology Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 5
- **UI Libraries**:
  - Tailwind CSS for styling
  - Recharts for K-line chart visualization
  - Lucide React for icons
- **AI Integration**: OpenAI-compatible API endpoints (supports Gemini models via proxy)

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Architecture Overview

### Application Flow

1. **User Input** (`BaziForm.tsx`): Users enter their Four Pillars (年月日时柱), birth year, Da Yun information, and API configuration
2. **API Service** (`geminiService.ts`): Processes user input and sends structured prompts to AI model
3. **Data Transformation**: AI returns JSON with 100 data points (ages 1-100) and categorical analysis
4. **Visualization**:
   - `LifeKLineChart.tsx` renders candlestick chart with age-based fortune trends
   - `AnalysisResult.tsx` displays detailed analysis across six categories with scores

### Key Data Flow

```
UserInput (Bazi + Da Yun)
  → geminiService.generateLifeAnalysis()
  → AI Model (with BAZI_SYSTEM_INSTRUCTION prompt)
  → LifeDestinyResult { chartData: KLinePoint[], analysis: AnalysisData }
  → Components render chart + analysis
```

### Important Data Structures

**KLinePoint** (types.ts:24): Represents one year of life
- `age`, `year`, `ganZhi` (流年干支), `daYun` (大运干支 - changes every 10 years)
- `open`, `close`, `high`, `low`, `score` (K-line values 0-100)
- `reason`: Detailed yearly forecast (100 characters)

**AnalysisData** (types.ts:37): Categorical life analysis
- Six categories: summary, industry, wealth, marriage, health, family
- Each category includes text analysis + score (0-10)

### Critical Business Logic

**Da Yun Direction Calculation** (geminiService.ts:36-45):
- Based on year pillar stem polarity (Yang/Yin) and gender
- Male + Yang Year = Forward (顺行), Male + Yin Year = Backward (逆行)
- Female + Yin Year = Forward (顺行), Female + Yang Year = Backward (逆行)
- This determines how the AI calculates the 10-year Da Yun sequence

**System Status Control** (constants.ts:64):
- `API_STATUS` flag: 1 = normal service, 0 = maintenance/busy
- Used in App.tsx:19 to block requests during high traffic

## Component Structure

- **App.tsx**: Main container, manages loading state and result display
- **components/BaziForm.tsx**: Form with validation, includes API configuration fields
- **components/LifeKLineChart.tsx**: Recharts-based candlestick chart with custom tooltip
- **components/AnalysisResult.tsx**: Six-category analysis display with score bars
- **services/geminiService.ts**: AI API integration
- **constants.ts**: System instruction prompt for AI + API status flag
- **types.ts**: TypeScript interfaces

## AI Prompt Engineering

The `BAZI_SYSTEM_INSTRUCTION` (constants.ts:2) is critical for accurate results. Key requirements:

1. **Age must start at 1** (虚岁 - traditional Chinese age counting)
2. **Da Yun sequence** must follow 60-stem cycle based on Forward/Backward direction
3. **daYun field** = 10-year period (e.g., "甲子大运"), **ganZhi field** = yearly stem (e.g., "2024=甲辰")
4. Each year's `reason` must be a detailed 100-character forecast
5. K-line logic: Close > Open = auspicious (green), Close < Open = inauspicious (red)

## Configuration

**Environment Variables** (vite.config.ts:8-11):
- Prioritizes `API_KEY` over `VITE_API_KEY`
- Stored in `.env.local` (gitignored)
- Note: Users now input API credentials via form, so this is optional/legacy

**User-Provided API Config** (BaziForm.tsx:249-292):
- Model name (default: "gemini-3-pro-preview")
- API Base URL (default: "https://max.openai365.top/v1")
- API Key (password field)

## Styling Conventions

- Tailwind utility classes throughout
- Custom font class: `font-serif-sc` for Chinese characters
- Responsive design: mobile-first with `md:` breakpoints
- Color scheme:
  - Green (#22c55e) = auspicious/up
  - Red (#ef4444) = inauspicious/down
  - Indigo = primary accent
  - Amber/Yellow = highlights

## Testing & Validation

When modifying AI integration:
1. Test with valid Four Pillars (e.g., 甲子, 丙寅, 戊辰, 壬戌)
2. Verify Da Yun direction calculation matches traditional Bazi rules
3. Check that `daYun` field changes every 10 years in chart data
4. Ensure `ganZhi` field follows 60-stem yearly cycle
5. Validate all 100 age points are present in response

## Known Behaviors

- Form validation requires all fields including API credentials
- Loading typically takes 3-5 minutes (shown in submit button)
- Chart renders 100 candlesticks (ages 1-100)
- Da Yun reference lines appear every 10 years on chart
- Tooltip shows detailed yearly forecast on hover/click
- Score bars use gradient colors: 9-10=green, 7-8=indigo, 5-6=yellow, 3-4=orange, 0-2=red

## File Dependencies

Critical files that affect multiple components:
- **types.ts**: Shared interfaces - changes here affect all components
- **constants.ts**: System prompt - directly impacts AI output quality
- **geminiService.ts**: API integration - affects all data transformation
- **vite.config.ts**: Build configuration and env variable handling
