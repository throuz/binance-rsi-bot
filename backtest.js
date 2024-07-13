import { getBacktestResult, getBestResult } from "./src/backtest.js";

const bestResult = await getBestResult();
const {
  isStillHasPosition,
  fund,
  rsiPeriod,
  rsiUpperLimit,
  rsiLowerLimit,
  leverage
} = bestResult;
console.log("================================================================");
await getBacktestResult({
  shouldLogResults: true,
  rsiPeriod,
  rsiUpperLimit,
  rsiLowerLimit,
  leverage
});
console.log("================================================================");
console.log("isStillHasPosition", isStillHasPosition);
console.log("fund", fund);
console.log("rsiPeriod", rsiPeriod);
console.log("rsiUpperLimit", rsiUpperLimit);
console.log("rsiLowerLimit", rsiLowerLimit);
console.log("leverage", leverage);
