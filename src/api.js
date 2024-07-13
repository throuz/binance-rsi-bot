import crypto from "node:crypto";
import querystring from "node:querystring";
import { SECRET_KEY } from "../configs/env-config.js";
import { nodeCache } from "./cache.js";
import { binanceFuturesAPI } from "./web-services.js";

export const getSignature = (params) => {
  const queryString = querystring.stringify(params);
  const signature = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(queryString)
    .digest("hex");
  return signature;
};

export const getBinanceFuturesAPI = async (path, params) => {
  const signature = getSignature(params);
  const key = path + "/" + signature;
  if (nodeCache.has(key)) {
    return nodeCache.get(key);
  }
  const response = await binanceFuturesAPI.get(path, {
    params: { ...params, signature }
  });
  nodeCache.set(key, response.data);
  return response.data;
};

// GET

export const exchangeInformationAPI = async () => {
  const responseData = await getBinanceFuturesAPI("/fapi/v1/exchangeInfo");
  return responseData;
};

export const futuresAccountBalanceAPI = async (params) => {
  const responseData = await getBinanceFuturesAPI("/fapi/v2/balance", params);
  return responseData;
};

export const symbolPriceTickerAPI = async (params) => {
  const responseData = await getBinanceFuturesAPI(
    "/fapi/v2/ticker/price",
    params
  );
  return responseData;
};

export const positionInformationAPI = async (params) => {
  const responseData = await getBinanceFuturesAPI(
    "/fapi/v2/positionRisk",
    params
  );
  return responseData;
};

export const klineDataAPI = async (params) => {
  const responseData = await getBinanceFuturesAPI("/fapi/v1/klines", params);
  return responseData;
};

// POST

export const changeInitialLeverageAPI = async (params) => {
  const signature = getSignature(params);
  const response = await binanceFuturesAPI.post("/fapi/v1/leverage", {
    ...params,
    signature
  });
  return response.data;
};

export const newOrderAPI = async (params) => {
  const signature = getSignature(params);
  const response = await binanceFuturesAPI.post("/fapi/v1/order", {
    ...params,
    signature
  });
  return response.data;
};

// DELETE

export const cancelAllOpenOrdersAPI = async (params) => {
  const signature = getSignature(params);
  const response = await binanceFuturesAPI.delete("/fapi/v1/allOpenOrders", {
    params: { ...params, signature }
  });
  return response.data;
};
