import { getCachedRsiData } from "./cached-data.js";

export const getSignal = async ({
  positionType,
  index,
  rsiPeriod,
  rsiUpperLimit,
  rsiLowerLimit,
  isUnRealizedProfit
}) => {
  const cachedRsiData = await getCachedRsiData();
  const rsiData = cachedRsiData.get(rsiPeriod);
  const preRsi = rsiData[index - 1];
  // OPEN_LONG
  if (positionType === "NONE") {
    if (preRsi > rsiUpperLimit) {
      return "OPEN_LONG";
    }
  }
  // CLOSE_LONG
  if (positionType === "LONG") {
    if (preRsi < rsiLowerLimit && isUnRealizedProfit) {
      return "CLOSE_LONG";
    }
  }
  // // OPEN_SHORT
  // if (positionType === "NONE") {
  //   if (preRsi < rsiLowerLimit) {
  //     return "OPEN_SHORT";
  //   }
  // }
  // // CLOSE_SHORT
  // if (positionType === "SHORT") {
  //   if (preRsi > rsiUpperLimit) {
  //     return "CLOSE_SHORT";
  //   }
  // }
  return "NONE";
};
