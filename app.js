import schedule from "node-schedule";
import { getBestResult } from "./src/backtest.js";
import { nodeCache } from "./src/cache.js";
import { errorHandler, sendLineNotify } from "./src/common.js";
import { getAvailableBalance, getPositionType } from "./src/helpers.js";
import { closePosition, openPosition } from "./src/trade.js";
import { getCachedKlineData } from "./src/cached-data.js";
import { rsi } from "technicalindicators";
import { getSignal } from "./src/signal.js";

const logBalance = async () => {
  const availableBalance = await getAvailableBalance();
  await sendLineNotify(`Balance: ${availableBalance}`);
};

const setSignalConfigs = async () => {
  console.log(new Date().toLocaleString());
  const bestResult = await getBestResult();
  const {
    currentPositionType,
    rsiPeriod,
    rsiLongLevel,
    rsiShortLevel,
    leverage
  } = bestResult;
  nodeCache.mset([
    { key: "currentPositionType", val: currentPositionType, ttl: 0 },
    { key: "rsiPeriod", val: rsiPeriod, ttl: 0 },
    { key: "rsiLongLevel", val: rsiLongLevel, ttl: 0 },
    { key: "rsiShortLevel", val: rsiShortLevel, ttl: 0 },
    { key: "leverage", val: leverage, ttl: 0 }
  ]);
  console.log(bestResult);
  await logBalance();
  console.log("==============================================================");
};

await setSignalConfigs();

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
    const tradeSignal = await getTradeSignal();
    if (tradeSignal === "OPEN_LONG") {
      await openPosition("BUY");
    }
    if (tradeSignal === "CLOSE_LONG") {
      await closePosition("SELL");
      await logBalance();
    }
  } catch (error) {
    await errorHandler(error);
  }
};

schedule.scheduleJob("1 * * * *", executeStrategy);
