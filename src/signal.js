export const getSignal = ({
  positionType,
  preRsi,
  rsiLongLevel,
  rsiShortLevel
}) => {
  // OPEN_LONG
  if (positionType === "NONE") {
    if (preRsi > rsiLongLevel) {
      return "OPEN_LONG";
    }
  }
  // CLOSE_LONG
  if (positionType === "LONG") {
    if (preRsi < rsiShortLevel) {
      return "CLOSE_LONG";
    }
  }
  return "NONE";
};
