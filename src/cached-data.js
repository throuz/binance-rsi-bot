import { getKlineData, getHAKlineData, getLTHAKlineData } from "./helpers.js";
import { RSI_PERIOD_SETTING } from "../configs/trade-config.js";
import { rsi, williamsr, stochasticrsi } from "technicalindicators";

let cachedKlineData = [];
let cachedHAKlineData = [];
let cachedLTHAKlineData = [];
let cachedUsefulData = [];
let cachedRsiData = new Map();

const shouldGetLatestData = (data) => {
  const noCachedData = data.length === 0;
  const isCachedDataExpired =
    data.length > 0 && Date.now() > data[data.length - 1].closeTime;
  if (process.env.NODE_SCRIPT === "backtest") {
    return noCachedData;
  }
  return noCachedData || isCachedDataExpired;
};

export const getCachedKlineData = async () => {
  if (shouldGetLatestData(cachedKlineData)) {
    const klineData = await getKlineData();
    cachedKlineData = klineData;
  }
  return cachedKlineData;
};

export const getCachedHAKlineData = async () => {
  if (shouldGetLatestData(cachedHAKlineData)) {
    const klineData = await getHAKlineData();
    cachedHAKlineData = klineData;
  }
  return cachedHAKlineData;
};

export const getCachedLTHAKlineData = async () => {
  if (shouldGetLatestData(cachedLTHAKlineData)) {
    const klineData = await getLTHAKlineData();
    cachedLTHAKlineData = klineData;
  }
  return cachedLTHAKlineData;
};

// Get cached useful data functions
const getCurHAOpenPrice = async (index) => {
  const cachedHAKlineData = await getCachedHAKlineData();
  return cachedHAKlineData[index].openPrice;
};

const getCurLTHAOpenPrice = async (index) => {
  const cachedHAKlineData = await getCachedHAKlineData();
  const cachedLTHAKlineData = await getCachedLTHAKlineData();
  const timestamp = cachedHAKlineData[index].openTime;
  const foundIndex = cachedLTHAKlineData.findIndex(
    (kline) => timestamp >= kline.openTime && timestamp <= kline.closeTime
  );
  return cachedLTHAKlineData[foundIndex].openPrice;
};

const getPreHAKlineTrend = async (index) => {
  const cachedHAKlineData = await getCachedHAKlineData();
  const { openPrice, closePrice } = cachedHAKlineData[index - 1];
  return closePrice > openPrice ? "UP" : "DOWN";
};

const getPreLTHAKlineTrend = async (index) => {
  const cachedHAKlineData = await getCachedHAKlineData();
  const cachedLTHAKlineData = await getCachedLTHAKlineData();
  const timestamp = cachedHAKlineData[index].openTime;
  const foundIndex = cachedLTHAKlineData.findIndex(
    (kline) => timestamp >= kline.openTime && timestamp <= kline.closeTime
  );
  const { openPrice, closePrice } = cachedLTHAKlineData[foundIndex - 1];
  return closePrice > openPrice ? "UP" : "DOWN";
};

const getPreVolume = async (index) => {
  const cachedKlineData = await getCachedKlineData();
  return cachedKlineData[index - 1].volume;
};

export const getCachedUsefulData = async () => {
  if (shouldGetLatestData(cachedUsefulData)) {
    const results = new Array(RSI_PERIOD_SETTING.max).fill(null);
    const cachedKlineData = await getCachedKlineData();
    for (let i = RSI_PERIOD_SETTING.max; i < cachedKlineData.length; i++) {
      const [
        curHAOpenPrice,
        curLTHAOpenPrice,
        preHAKlineTrend,
        preLTHAKlineTrend,
        preVolume
      ] = await Promise.all([
        getCurHAOpenPrice(i),
        getCurLTHAOpenPrice(i),
        getPreHAKlineTrend(i),
        getPreLTHAKlineTrend(i),
        getPreVolume(i)
      ]);
      results[i] = {
        curHAOpenPrice,
        curLTHAOpenPrice,
        preHAKlineTrend,
        preLTHAKlineTrend,
        preVolume,
        closeTime: cachedKlineData[i].closeTime
      };
      cachedUsefulData = results;
    }
  }
  return cachedUsefulData;
};

const shouldGetLatestRsiData = () => {
  const noCachedData = cachedRsiData.size === 0;
  const isCachedDataExpired = Date.now() > cachedRsiData.get("timestamp");
  if (process.env.NODE_SCRIPT === "backtest") {
    return noCachedData;
  }
  return noCachedData || isCachedDataExpired;
};

export const getCachedRsiData = async () => {
  if (shouldGetLatestRsiData()) {
    const cachedKlineData = await getCachedKlineData();
    const values = cachedKlineData.map((kline) => kline.closePrice);
    const timestamp = cachedKlineData[cachedKlineData.length - 1].closeTime;
    cachedRsiData.set("timestamp", timestamp);
    for (
      let period = RSI_PERIOD_SETTING.min;
      period <= RSI_PERIOD_SETTING.max;
      period += RSI_PERIOD_SETTING.step
    ) {
      const rsiData = rsi({ period, values });
      const emptyArray = Array(period).fill(null);
      cachedRsiData.set(period, [...emptyArray, ...rsiData]);
    }
  }
  return cachedRsiData;
};
