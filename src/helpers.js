import { heikinashi } from "technicalindicators";
import {
  KLINE_INTERVAL,
  KLINE_LIMIT,
  LONG_TERM_KLINE_INTERVAL,
  QUOTE_ASSET,
  SYMBOL,
  KLINE_START_TIME,
  IS_KLINE_START_TIME_TO_NOW
} from "../configs/trade-config.js";
import {
  exchangeInformationAPI,
  futuresAccountBalanceAPI,
  klineDataAPI,
  symbolPriceTickerAPI,
  positionInformationAPI
} from "./api.js";
import { nodeCache } from "./cache.js";

export const getStepSize = async () => {
  const exchangeInformation = await exchangeInformationAPI();
  const symbolData = exchangeInformation.symbols.find(
    (item) => item.symbol === SYMBOL
  );
  const stepSize = symbolData.filters.find(
    (filter) => filter.filterType === "LOT_SIZE"
  ).stepSize;
  return stepSize;
};

export const getAvailableBalance = async () => {
  const params = { recvWindow: 60000, timestamp: Date.now() };
  const futuresAccountBalance = await futuresAccountBalanceAPI(params);
  const availableBalance = futuresAccountBalance.find(
    ({ asset }) => asset === QUOTE_ASSET
  ).availableBalance;
  return availableBalance;
};

const getLatestPrice = async () => {
  const params = { symbol: SYMBOL };
  const symbolPriceTicker = await symbolPriceTickerAPI(params);
  return symbolPriceTicker.price;
};

const getAvailableQuantity = async () => {
  const [availableBalance, latestPrice] = await Promise.all([
    getAvailableBalance(),
    getLatestPrice()
  ]);
  const leverage = nodeCache.get("leverage");
  const availableFunds = availableBalance * leverage;
  return availableFunds / latestPrice;
};

export const getPositionInformation = async () => {
  const params = {
    symbol: SYMBOL,
    recvWindow: 60000,
    timestamp: Date.now()
  };
  const positionInformation = await positionInformationAPI(params);
  return positionInformation[0];
};

export const getPositionType = async () => {
  const positionInformation = await getPositionInformation();
  const positionAmt = Number(positionInformation.positionAmt);
  if (positionAmt > 0) {
    return "LONG";
  }
  if (positionAmt < 0) {
    return "SHORT";
  }
  return "NONE";
};

export const getIsUnRealizedProfit = async () => {
  const positionInformation = await getPositionInformation();
  const unRealizedProfit = Number(positionInformation.unRealizedProfit);
  return unRealizedProfit > 0;
};

const getAllowableQuantity = async () => {
  const [positionInformation, latestPrice] = await Promise.all([
    getPositionInformation(),
    getLatestPrice()
  ]);
  const { maxNotionalValue, positionAmt } = positionInformation;
  const maxAllowableQuantity = maxNotionalValue / latestPrice;
  return maxAllowableQuantity - Math.abs(positionAmt);
};

const getInvestableQuantity = async () => {
  const [availableQuantity, allowableQuantity] = await Promise.all([
    getAvailableQuantity(),
    getAllowableQuantity()
  ]);
  return Math.min(availableQuantity, allowableQuantity);
};

export const getOrderQuantity = async (orderAmountPercent) => {
  const investableQuantity = await getInvestableQuantity();
  const orderQuantity = investableQuantity * (orderAmountPercent / 100);
  return orderQuantity;
};

export const getOriginalKlineData = async () => {
  const now = Date.now();
  let originalKlineData = [];
  let startTime = KLINE_START_TIME;
  do {
    const params = {
      symbol: SYMBOL,
      interval: KLINE_INTERVAL,
      limit: KLINE_LIMIT,
      startTime
    };
    const klineData = await klineDataAPI(params);
    originalKlineData = originalKlineData.concat(klineData);
    if (klineData.length > 0) {
      startTime = klineData[klineData.length - 1][6] + 1;
    }
    if (!IS_KLINE_START_TIME_TO_NOW) break;
  } while (startTime && startTime < now);
  return originalKlineData;
};

export const getKlineData = async () => {
  const klineData = await getOriginalKlineData();
  const results = klineData.map((kline) => ({
    openPrice: Number(kline[1]),
    highPrice: Number(kline[2]),
    lowPrice: Number(kline[3]),
    closePrice: Number(kline[4]),
    volume: Number(kline[5]),
    openTime: kline[0],
    closeTime: kline[6]
  }));
  return results;
};

// HA -> Heikin Ashi
export const getHAKlineData = async () => {
  const klineData = await getOriginalKlineData();
  const openPrices = klineData.map((kline) => Number(kline[1]));
  const highPrices = klineData.map((kline) => Number(kline[2]));
  const lowPrices = klineData.map((kline) => Number(kline[3]));
  const closePrices = klineData.map((kline) => Number(kline[4]));
  const heikinashiResults = heikinashi({
    open: openPrices,
    high: highPrices,
    low: lowPrices,
    close: closePrices
  });
  const results = klineData.map((kline, i) => ({
    openPrice: heikinashiResults.open[i],
    highPrice: heikinashiResults.high[i],
    lowPrice: heikinashiResults.low[i],
    closePrice: heikinashiResults.close[i],
    volume: Number(kline[5]),
    openTime: kline[0],
    closeTime: kline[6]
  }));
  return results;
};

// LTHA -> Long Term Heikin Ashi
export const getLTHAKlineData = async () => {
  const params = {
    symbol: SYMBOL,
    interval: LONG_TERM_KLINE_INTERVAL,
    limit: 1500
  };
  const klineData = await klineDataAPI(params);
  const openPrices = klineData.map((kline) => Number(kline[1]));
  const highPrices = klineData.map((kline) => Number(kline[2]));
  const lowPrices = klineData.map((kline) => Number(kline[3]));
  const closePrices = klineData.map((kline) => Number(kline[4]));
  const heikinashiResults = heikinashi({
    open: openPrices,
    high: highPrices,
    low: lowPrices,
    close: closePrices
  });
  const results = klineData.map((kline, i) => ({
    openPrice: heikinashiResults.open[i],
    highPrice: heikinashiResults.high[i],
    lowPrice: heikinashiResults.low[i],
    closePrice: heikinashiResults.close[i],
    volume: Number(kline[5]),
    openTime: kline[0],
    closeTime: kline[6]
  }));
  return results;
};

const getPrecisionBySize = (size) => {
  if (size === "1") {
    return 0;
  } else {
    return size.indexOf("1") - 1;
  }
};

export const formatBySize = (number, size) => {
  const precision = getPrecisionBySize(size);
  return Number(number.toFixed(precision));
};
