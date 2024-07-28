import schedule from "node-schedule";
import { getBestResult } from "./src/backtest.js";
import { nodeCache } from "./src/cache.js";
import { errorHandler, sendLineNotify } from "./src/common.js";
import { getAvailableBalance, getPositionType } from "./src/helpers.js";
import { closePosition, openPosition } from "./src/trade.js";

const setSignalConfigs = async () => {
  console.log(new Date().toLocaleString());
  const bestResult = await getBestResult();
  const { currentPositionType, leverage } = bestResult;
  nodeCache.mset([
    { key: "currentPositionType", val: currentPositionType, ttl: 0 },
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
    await setSignalConfigs();
    const positionType = await getPositionType();
    const currentPositionType = nodeCache.get("currentPositionType");
    if (positionType === "NONE" && currentPositionType === "LONG") {
      await openPosition("BUY");
    }
    if (positionType === "NONE" && currentPositionType === "SHORT") {
      await openPosition("SELL");
    }
    if (positionType === "LONG" && currentPositionType === "SHORT") {
      await closePosition("SELL");
      await openPosition("SELL");
      await logBalance();
    }
    if (positionType === "SHORT" && currentPositionType === "LONG") {
      await closePosition("BUY");
      await openPosition("BUY");
      await logBalance();
    }
  } catch (error) {
    await errorHandler(error);
  }
};

await setSignalConfigs();

schedule.scheduleJob("1 8 * * *", executeStrategy);
