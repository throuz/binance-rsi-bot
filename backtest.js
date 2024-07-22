import { getBacktestResult, getBestResult } from "./src/backtest.js";

const bestResult = await getBestResult();
const {
  isStillHasPosition,
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
console.log("isStillHasPosition", isStillHasPosition);
console.log("fund", fund);
console.log("rsiPeriod", rsiPeriod);
console.log("rsiLongLevel", rsiLongLevel);
console.log("rsiShortLevel", rsiShortLevel);
console.log("leverage", leverage);
