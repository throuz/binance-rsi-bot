export const SYMBOL = "BTCUSDT";
export const QUOTE_ASSET = "USDT";
export const ORDER_AMOUNT_PERCENT = 100; // 100%
export const KLINE_INTERVAL = "1h";
export const KLINE_LIMIT = 1500;

// Only for backtest
export const INITIAL_FUNDING = 100;
export const FEE = 0.0005; // 0.05%
export const FUNDING_RATE = 0.0001; // 0.01%
export const RSI_PERIOD_SETTING = { min: 1, max: 50, step: 1 };
export const RSI_LONG_LEVEL_SETTING = { min: 50, max: 100, step: 1 };
export const RSI_SHORT_LEVEL_SETTING = { min: 1, max: 50, step: 1 };
export const LEVERAGE_SETTING = { min: 1, max: 5, step: 1 };
export const RANDOM_SAMPLE_NUMBER = 50000; // number or null
export const KLINE_START_TIME = getTimestampYearsAgo(10); // timestamp or null
export const IS_KLINE_START_TIME_TO_NOW = true;

function getTimestampYearsAgo(years) {
  const currentDate = new Date();
  const targetYear = currentDate.getFullYear() - years;
  currentDate.setFullYear(targetYear);
  return currentDate.getTime();
}
