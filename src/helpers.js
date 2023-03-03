import crypto from "node:crypto";
import querystring from "node:querystring";
import env from "./env.js";
import tradeConfig from "./trade-config.js";
import { binanceFuturesAPI, taAPI } from "./axios-instances.js";
import { handleAPIError, log } from "./common.js";

const { SECRET_KEY } = env;
const { BASE_ASSET, QUOTE_ASSET, SYMBOL, LEVERAGE } = tradeConfig;

const getSignature = (queryString) =>
  crypto.createHmac("sha256", SECRET_KEY).update(queryString).digest("hex");

const getAvailableBalance = async () => {
  try {
    const totalParams = { timestamp: Date.now() };
    const queryString = querystring.stringify(totalParams);
    const signature = getSignature(queryString);

    const response = await binanceFuturesAPI.get(
      `/fapi/v1/balance?${queryString}&signature=${signature}`
    );
    const availableBalance = response.data.find(
      ({ asset }) => asset === QUOTE_ASSET
    ).withdrawAvailable;
    return availableBalance;
  } catch (error) {
    await handleAPIError(error);
  }
};

const getMarkPrice = async () => {
  try {
    const totalParams = { symbol: SYMBOL };
    const queryString = querystring.stringify(totalParams);

    const response = await binanceFuturesAPI.get(
      `/fapi/v1/premiumIndex?${queryString}`
    );
    return response.data.markPrice;
  } catch (error) {
    await handleAPIError(error);
  }
};

const getOppositeSide = (side) => {
  if (side === "BUY") {
    return "SELL";
  }
  if (side === "SELL") {
    return "BUY";
  }
};

const getAvailableQuantity = async () => {
  const availableBalance = await getAvailableBalance();
  const markPrice = await getMarkPrice();
  const availableFunds = availableBalance * LEVERAGE;
  return Math.trunc((availableFunds / markPrice) * 1000) / 1000;
};

const getPositionAmount = async () => {
  try {
    const totalParams = { symbol: SYMBOL, timestamp: Date.now() };
    const queryString = querystring.stringify(totalParams);
    const signature = getSignature(queryString);

    const response = await binanceFuturesAPI.get(
      `/fapi/v2/positionRisk?${queryString}&signature=${signature}`
    );
    return response.data[0].positionAmt;
  } catch (error) {
    await handleAPIError(error);
  }
};

const getAllowableQuantity = async () => {
  try {
    const totalParams = { symbol: SYMBOL, timestamp: Date.now() };
    const queryString = querystring.stringify(totalParams);
    const signature = getSignature(queryString);

    const response = await binanceFuturesAPI.get(
      `/fapi/v2/positionRisk?${queryString}&signature=${signature}`
    );
    const { maxNotionalValue, positionAmt } = response.data[0];
    const markPrice = await getMarkPrice();
    const maxAllowableQuantity =
      Math.trunc((maxNotionalValue / markPrice) * 1000) / 1000;
    return maxAllowableQuantity - Math.abs(positionAmt);
  } catch (error) {
    await handleAPIError(error);
  }
};

const getSignal = async () => {
  try {
    const totalParams = {
      exchange: "binance",
      symbol: `${BASE_ASSET}/${QUOTE_ASSET}`,
      interval: "1m"
    };
    const queryString = querystring.stringify(totalParams);

    const response = await taAPI.get(`/rsi?${queryString}`);
    const RSI = response.data.value;
    log(`RSI: ${RSI}`);
    if (RSI < 30) {
      return "BUY";
    }
    if (RSI > 70) {
      return "SELL";
    }
    return "NONE";
  } catch (error) {
    await handleAPIError(error);
  }
};

const getOrderQuantity = async () => {
  const availableQuantity = await getAvailableQuantity();
  const allowableQuantity = await getAllowableQuantity();
  return Math.min(availableQuantity, allowableQuantity) === 0 ? 0 : 0.001;
};

const getPositionDirection = (positionAmount) => {
  if (positionAmount === 0) {
    return "NONE";
  }
  if (positionAmount > 0) {
    return "BUY";
  }
  if (positionAmount < 0) {
    return "SELL";
  }
};

export {
  getSignature,
  getAvailableBalance,
  getMarkPrice,
  getOppositeSide,
  getAvailableQuantity,
  getPositionAmount,
  getAllowableQuantity,
  getSignal,
  getOrderQuantity,
  getPositionDirection
};
