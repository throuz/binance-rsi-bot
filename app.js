import schedule from "node-schedule";
import { getBestResult } from "./src/backtest.js";
import { nodeCache } from "./src/cache.js";
import { getCachedKlineData } from "./src/cached-data.js";
import { errorHandler, sendLineNotify } from "./src/common.js";
import {
  getAvailableBalance,
  getPositionType,
  getIsUnRealizedProfit
} from "./src/helpers.js";
import { getSignal } from "./src/signal.js";
import { closePosition, openPosition } from "./src/trade.js";

const setSignalConfigs = async () => {
  console.log(new Date().toLocaleString());
  const bestResult = await getBestResult();
  const {
    isStillHasPosition,
    rsiPeriod,
    rsiUpperLimit,
    rsiLowerLimit,
    leverage
  } = bestResult;
  nodeCache.mset([
    { key: "isStillHasPosition", val: isStillHasPosition, ttl: 0 },
    { key: "rsiPeriod", val: rsiPeriod, ttl: 0 },
    { key: "rsiUpperLimit", val: rsiUpperLimit, ttl: 0 },
    { key: "rsiLowerLimit", val: rsiLowerLimit, ttl: 0 },
    { key: "leverage", val: leverage, ttl: 0 }
  ]);
  console.log(bestResult);
  console.log("==============================================================");
};

const logBalance = async () => {
  const availableBalance = await getAvailableBalance();
  await sendLineNotify(`Balance: ${availableBalance}`);
};

const executeStrategy = async () => {
  try {
    const { rsiPeriod, rsiUpperLimit, rsiLowerLimit } = nodeCache.mget([
      "rsiPeriod",
      "rsiUpperLimit",
      "rsiLowerLimit"
    ]);
    const [positionType, cachedKlineData, isUnRealizedProfit] =
      await Promise.all([
        getPositionType(),
        getCachedKlineData(),
        getIsUnRealizedProfit()
      ]);
    const signal = await getSignal({
      positionType,
      index: cachedKlineData.length - 1,
      rsiPeriod,
      rsiUpperLimit,
      rsiLowerLimit,
      isUnRealizedProfit
    });
    if (signal === "OPEN_LONG") {
      await openPosition("BUY");
    }
    if (signal === "CLOSE_LONG") {
      await closePosition("SELL");
      await logBalance();
      if (isUnRealizedProfit === false) {
        await setSignalConfigs();
      }
    }
    if (signal === "OPEN_SHORT") {
      await openPosition("SELL");
    }
    if (signal === "CLOSE_SHORT") {
      await closePosition("BUY");
      await logBalance();
      if (isUnRealizedProfit === false) {
        await setSignalConfigs();
      }
    }
    if (positionType === "NONE" && signal === "NONE") {
      await setSignalConfigs();
    }
  } catch (error) {
    await errorHandler(error);
  }
};

await setSignalConfigs();

schedule.scheduleJob("1 * * * *", executeStrategy);
