import { getKlineData } from "./helpers.js";
import { RSI_PERIOD_SETTING } from "../configs/trade-config.js";
import { rsi } from "technicalindicators";

let cachedKlineData = [];
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
      const emptyLength = values.length - rsiData.length;
      const emptyArray = Array(emptyLength).fill(null);
      cachedRsiData.set(period, [...emptyArray, ...rsiData]);
    }
  }
  return cachedRsiData;
};
