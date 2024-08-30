import schedule from "node-schedule";
import { nodeCache } from "./src/cache.js";
import { errorHandler, sendLineNotify } from "./src/common.js";
import { getAvailableBalance, getPositionType } from "./src/helpers.js";
import { closePosition, openPosition } from "./src/trade.js";
import { getCachedKlineData } from "./src/cached-data.js";
import { rsi } from "technicalindicators";
import { getSignal } from "./src/signal.js";
import {
  RSI_PERIOD,
  RSI_LONG_LEVEL,
  RSI_SHORT_LEVEL,
  LEVERAGE
} from "./configs/trade-config.js";

const logBalance = async () => {
  const availableBalance = await getAvailableBalance();
  await sendLineNotify(`Balance: ${availableBalance}`);
};

const setTradeConfigs = async () => {
  console.log(new Date().toLocaleString());
  nodeCache.mset([
    { key: "rsiPeriod", val: RSI_PERIOD, ttl: 0 },
    { key: "rsiLongLevel", val: RSI_LONG_LEVEL, ttl: 0 },
    { key: "rsiShortLevel", val: RSI_SHORT_LEVEL, ttl: 0 },
    { key: "leverage", val: LEVERAGE, ttl: 0 }
  ]);
  await logBalance();
  console.log("============================================================");
};

await setTradeConfigs();

const getTradeSignal = async () => {
  const positionType = await getPositionType();
  const cachedKlineData = await getCachedKlineData();
  const values = cachedKlineData.map((kline) => kline.closePrice);
  const rsiPeriod = nodeCache.get("rsiPeriod");
  const rsiLongLevel = nodeCache.get("rsiLongLevel");
  const rsiShortLevel = nodeCache.get("rsiShortLevel");
  const rsiData = rsi({ period: rsiPeriod, values });
  const preRsi = rsiData[rsiData.length - 2];
  return getSignal({
    positionType,
    preRsi,
    rsiLongLevel,
    rsiShortLevel
  });
};

const executeStrategy = async () => {
  try {
    console.log(new Date().toLocaleString());
    const tradeSignal = await getTradeSignal();
    if (tradeSignal === "NONE") {
      console.log("NONE");
    }
    if (tradeSignal === "OPEN_LONG") {
      await openPosition("BUY");
    }
    if (tradeSignal === "CLOSE_LONG") {
      await closePosition("SELL");
      await logBalance();
    }
    console.log("============================================================");
  } catch (error) {
    await errorHandler(error);
  }
};

schedule.scheduleJob("1 * * * *", executeStrategy);
