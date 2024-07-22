import { getCachedRsiData } from "./cached-data.js";

export const getSignal = async ({
  positionType,
  index,
  rsiPeriod,
  rsiLongLevel,
  rsiShortLevel
}) => {
  const cachedRsiData = await getCachedRsiData();
  const rsiData = cachedRsiData.get(rsiPeriod);
  const preRsi = rsiData[index - 1];
  // OPEN_LONG
  if (positionType === "NONE") {
    if (preRsi > rsiLongLevel) {
      return "OPEN_LONG";
    }
  }
  // OPEN_SHORT
  if (positionType === "NONE") {
    if (preRsi < rsiShortLevel) {
      return "OPEN_SHORT";
    }
  }
  // LONG_TO_SHORT
  if (positionType === "LONG") {
    if (preRsi < rsiShortLevel) {
      return "LONG_TO_SHORT";
    }
  }
  // SHORT_TO_LONG
  if (positionType === "SHORT") {
    if (preRsi > rsiLongLevel) {
      return "SHORT_TO_LONG";
    }
  }
  return "NONE";
};
