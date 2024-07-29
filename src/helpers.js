import {
  KLINE_INTERVAL,
  KLINE_LIMIT,
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
  if (positionInformation === undefined) {
    return "NONE";
  }
  const positionAmt = Number(positionInformation.positionAmt);
  if (positionAmt > 0) {
    return "LONG";
  }
  if (positionAmt < 0) {
    return "SHORT";
  }
  return "NONE";
};

export const getOrderQuantity = async (orderAmountPercent) => {
  const availableQuantity = await getAvailableQuantity();
  const orderQuantity = availableQuantity * (orderAmountPercent / 100);
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
