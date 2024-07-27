import { getBacktestResult, getBestResult } from "./src/backtest.js";

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
await getBacktestResult({
  shouldLogResults: true,
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
