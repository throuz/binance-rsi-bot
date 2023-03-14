import { binanceFuturesAPI } from "./src/web-services.js";
import { handleAPIError, sendLineNotify, log } from "./src/common.js";
import {
  getSignature,
  getPositionAmount,
  getOppositeSide,
  getSignal,
  getPositionDirection,
  getAvailableQuantity,
  getAllowableQuantity
} from "./src/helpers.js";
import tradeConfig from "./src/trade-config.js";

const { SYMBOL, QUANTITY_PER_ORDER } = tradeConfig;

const newOrder = async (side) => {
  try {
    const totalParams = {
      symbol: SYMBOL,
      type: "MARKET",
      side,
      positionSide: "BOTH",
      quantity: QUANTITY_PER_ORDER,
      reduceOnly: false,
      timestamp: Date.now()
    };
    const signature = getSignature(totalParams);

    await binanceFuturesAPI.post("/fapi/v1/order", {
      ...totalParams,
      signature
    });
    log(`New ${side} order!`);
    await sendLineNotify(`New ${side} order!`);
  } catch (error) {
    await handleAPIError(error);
  }
};

const closePosition = async (side, quantity) => {
  try {
    const totalParams = {
      symbol: SYMBOL,
      type: "MARKET",
      side,
      quantity,
      positionSide: "BOTH",
      reduceOnly: true,
      newOrderRespType: "RESULT",
      timestamp: Date.now()
    };
    const signature = getSignature(totalParams);

    await binanceFuturesAPI.post("/fapi/v1/order", {
      ...totalParams,
      signature
    });
    log("Close position!");
    await sendLineNotify("Close position!");
  } catch (error) {
    await handleAPIError(error);
  }
};

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
  setTimeout(check, 60000);
};

check();
