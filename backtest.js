import { getBacktestResult, getBestResult } from "./src/backtest.js";
import { getStepSize } from "./src/helpers.js";
import { getCachedKlineData, getCachedRsiData } from "./src/cached-data.js";

const bestResult = await getBestResult();
const {
  currentPositionType,
  fund,
  rsiPeriod,
  rsiLongLevel,
  rsiShortLevel,
  leverage
} = bestResult;
console.log("================================================================");

const [cachedKlineData, cachedRsiData, stepSize] = await Promise.all([
  getCachedKlineData(),
  getCachedRsiData(),
  getStepSize()
]);

getBacktestResult({
  shouldLogResults: true,
  cachedKlineData,
  cachedRsiData,
  stepSize,
  rsiPeriod,
  rsiLongLevel,
  rsiShortLevel,
  leverage
});

console.log("================================================================");
console.log("currentPositionType", currentPositionType);
console.log("fund", fund);
console.log("rsiPeriod", rsiPeriod);
console.log("rsiLongLevel", rsiLongLevel);
console.log("rsiShortLevel", rsiShortLevel);
console.log("leverage", leverage);
