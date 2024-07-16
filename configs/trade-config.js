export const SYMBOL = "BTCUSDT";
export const QUOTE_ASSET = "USDT";
export const ORDER_AMOUNT_PERCENT = 100; // 100%
export const KLINE_INTERVAL = "1h";
export const KLINE_LIMIT = 1500;

// Only for backtest
export const INITIAL_FUNDING = 100;
export const FEE = 0.0005; // 0.05%
export const FUNDING_RATE = 0.0001; // 0.01%
export const RSI_PERIOD_SETTING = { min: 5, max: 35, step: 1 };
export const RSI_UPPER_LIMIT_SETTING = { min: 65, max: 85, step: 1 };
export const RSI_LOWER_LIMIT_SETTING = { min: 15, max: 35, step: 1 };
export const LEVERAGE_SETTING = { min: 3, max: 3, step: 1 };
export const RANDOM_SAMPLE_NUMBER = null; // number or null
export const KLINE_START_TIME = getTimestampYearsAgo(4); // timestamp or null
export const IS_KLINE_START_TIME_TO_NOW = true;

function getTimestampYearsAgo(years) {
  const currentDate = new Date();
  const targetYear = currentDate.getFullYear() - years;
  currentDate.setFullYear(targetYear);
  return currentDate.getTime();
}
