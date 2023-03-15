import tradeConfig from "../configs/trade-config.js";
import { binanceFuturesAPI } from "./web-services.js";
import { handleAPIError, sendLineNotify, log } from "./common.js";
import { getSignature } from "./helpers.js";

const { SYMBOL } = tradeConfig;

const newOrder = async (side, quantity) => {
  try {
    const totalParams = {
      symbol: SYMBOL,
      type: "MARKET",
      side,
      positionSide: "BOTH",
      quantity,
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

export { newOrder, closePosition };
