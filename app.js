import tradeConfig from "./configs/trade-config.js";
import { log } from "./src/common.js";
import {
  getPositionAmount,
  getOppositeSide,
  getSignal,
  getPositionDirection,
  getAvailableQuantity,
  getAllowableQuantity
} from "./src/helpers.js";
import { newOrder, closePosition } from "./src/trade.js";

const { QUANTITY_PER_ORDER } = tradeConfig;

const makeNewOrder = async (signal) => {
  const [availableQuantity, allowableQuantity] = await Promise.all([
    getAvailableQuantity(),
    getAllowableQuantity()
  ]);

  if (Math.min(availableQuantity, allowableQuantity) >= QUANTITY_PER_ORDER) {
    await newOrder(signal);
  } else {
    log("Insufficient quantity, unable to place an order!");
  }
};

const check = async () => {
  const signal = await getSignal();
  if (signal !== "NONE") {
    const positionAmount = await getPositionAmount();
    const positionDirection = getPositionDirection(positionAmount);
    const oppositeSignal = getOppositeSide(signal);

    if (positionDirection === oppositeSignal) {
      await closePosition(signal, Math.abs(positionAmount));
      await makeNewOrder(signal);
    } else {
      await makeNewOrder(signal);
    }
  }
};

check();
setInterval(() => {
  check();
}, 60000);
