import { Presets, SingleBar } from "cli-progress";
import {
  RSI_PERIOD_SETTING,
  RSI_LOWER_LIMIT_SETTING,
  FEE,
  FUNDING_RATE,
  INITIAL_FUNDING,
  RSI_UPPER_LIMIT_SETTING,
  LEVERAGE_SETTING,
  ORDER_AMOUNT_PERCENT,
  RANDOM_SAMPLE_NUMBER
} from "../configs/trade-config.js";
import { getCachedKlineData } from "./cached-data.js";
import { getSignal } from "./signal.js";

const getReadableTime = (timestamp) => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const getLogColor = ({ positionType, openPrice, closePrice }) => {
  const logRedColor = "\x1b[31m";
  const logGreenColor = "\x1b[32m";
  if (positionType === "LONG") {
    return closePrice > openPrice ? logGreenColor : logRedColor;
  }
  if (positionType === "SHORT") {
    return openPrice > closePrice ? logGreenColor : logRedColor;
  }
  return "";
};

const logTradeResult = ({
  fund,
  positionType,
  openPrice,
  closePrice,
  openTimestamp,
  closeTimestamp
}) => {
  const logResetColor = "\x1b[0m";
  const logColor = getLogColor({
    positionType,
    openPrice,
    closePrice
  });
  const formatedFund = fund.toFixed(2);
  const startTime = getReadableTime(openTimestamp);
  const endTime = getReadableTime(closeTimestamp);
  console.log(
    `${logColor}Fund: ${formatedFund} ${positionType} [${openPrice} ~ ${closePrice}] [${startTime} ~ ${endTime}]${logResetColor}`
  );
};

const getFundingFee = ({ positionFund, openTimestamp, closeTimestamp }) => {
  const timeDifference = closeTimestamp - openTimestamp;
  const hours = timeDifference / (1000 * 60 * 60);
  const times = Math.floor(hours / 8);
  const fundingFee = positionFund * FUNDING_RATE * times;
  return fundingFee;
};

const getIsUnRealizedProfit = ({ positionType, openPrice, curPrice }) => {
  if (positionType === "LONG") {
    return openPrice < curPrice;
  }
  if (positionType === "SHORT") {
    return openPrice > curPrice;
  }
  return false;
};

export const getBacktestResult = async ({
  shouldLogResults,
  rsiPeriod,
  rsiUpperLimit,
  rsiLowerLimit,
  leverage
}) => {
  let fund = INITIAL_FUNDING;
  let positionType = "NONE";
  let positionFund = null;
  let openTimestamp = null;
  let openPrice = null;
  let liquidationPrice = null;
  let quantity = null;
  const cachedKlineData = await getCachedKlineData();
  for (let i = RSI_PERIOD_SETTING.max + 1; i < cachedKlineData.length; i++) {
    const curKline = cachedKlineData[i];
    const isUnRealizedProfit = getIsUnRealizedProfit({
      positionType,
      openPrice,
      curPrice: curKline.openPrice
    });
    const signal = await getSignal({
      positionType,
      index: i,
      rsiPeriod,
      rsiUpperLimit,
      rsiLowerLimit,
      isUnRealizedProfit
    });
    if (signal === "OPEN_LONG") {
      positionFund = fund * ((ORDER_AMOUNT_PERCENT - 1) / 100) * leverage; // Actual tests have found that typically 1% less
      const fee = positionFund * FEE;
      fund = fund - fee;
      positionType = "LONG";
      openTimestamp = curKline.openTime;
      openPrice = curKline.openPrice;
      liquidationPrice = openPrice * (1 - 1 / leverage + 0.01); // Actual tests have found that typically 1% deviation
      quantity = positionFund / openPrice;
    }
    if (signal === "CLOSE_LONG") {
      const closePrice = curKline.openPrice;
      const pnl = (closePrice - openPrice) * quantity;
      positionFund += pnl;
      const fee = positionFund * FEE;
      const closeTimestamp = curKline.openTime;
      const fundingFee = getFundingFee({
        positionFund,
        openTimestamp,
        closeTimestamp
      });
      fund = fund + pnl - fee - fundingFee;
      if (shouldLogResults) {
        logTradeResult({
          fund,
          positionType,
          openPrice,
          closePrice,
          openTimestamp,
          closeTimestamp
        });
      }
      positionType = "NONE";
      positionFund = null;
      openTimestamp = null;
      openPrice = null;
      liquidationPrice = null;
      quantity = null;
    }
    if (signal === "OPEN_SHORT") {
      positionFund = fund * ((ORDER_AMOUNT_PERCENT - 1) / 100) * leverage; // Actual tests have found that typically 1% less
      const fee = positionFund * FEE;
      fund = fund - fee;
      positionType = "SHORT";
      openTimestamp = curKline.openTime;
      openPrice = curKline.openPrice;
      liquidationPrice = openPrice * (1 + 1 / leverage - 0.01); // Actual tests have found that typically 1% deviation
      quantity = positionFund / openPrice;
    }
    if (signal === "CLOSE_SHORT") {
      const closePrice = curKline.openPrice;
      const pnl = (openPrice - closePrice) * quantity;
      positionFund += pnl;
      const fee = positionFund * FEE;
      const closeTimestamp = curKline.openTime;
      const fundingFee = getFundingFee({
        positionFund,
        openTimestamp,
        closeTimestamp
      });
      fund = fund + pnl - fee + fundingFee;
      if (shouldLogResults) {
        logTradeResult({
          fund,
          positionType,
          openPrice,
          closePrice,
          openTimestamp,
          closeTimestamp
        });
      }
      positionType = "NONE";
      positionFund = null;
      openTimestamp = null;
      openPrice = null;
      liquidationPrice = null;
      quantity = null;
    }
    // Liquidation
    if (
      (positionType === "LONG" && curKline.lowPrice < liquidationPrice) ||
      (positionType === "SHORT" && curKline.highPrice > liquidationPrice)
    ) {
      return null;
    }
  }
  return {
    isStillHasPosition: !!positionFund,
    fund,
    rsiPeriod,
    rsiUpperLimit,
    rsiLowerLimit,
    leverage
  };
};

const getAddedNumber = ({ number, addNumber, digit }) => {
  return Number((number + addNumber).toFixed(digit));
};

const getSettings = () => {
  const settings = [];
  for (
    let leverage = LEVERAGE_SETTING.min;
    leverage <= LEVERAGE_SETTING.max;
    leverage = getAddedNumber({
      number: leverage,
      addNumber: LEVERAGE_SETTING.step,
      digit: 0
    })
  ) {
    for (
      let rsiPeriod = RSI_PERIOD_SETTING.min;
      rsiPeriod <= RSI_PERIOD_SETTING.max;
      rsiPeriod = getAddedNumber({
        number: rsiPeriod,
        addNumber: RSI_PERIOD_SETTING.step,
        digit: 0
      })
    ) {
      for (
        let rsiUpperLimit = RSI_UPPER_LIMIT_SETTING.min;
        rsiUpperLimit <= RSI_UPPER_LIMIT_SETTING.max;
        rsiUpperLimit = getAddedNumber({
          number: rsiUpperLimit,
          addNumber: RSI_UPPER_LIMIT_SETTING.step,
          digit: 0
        })
      ) {
        for (
          let rsiLowerLimit = RSI_LOWER_LIMIT_SETTING.min;
          rsiLowerLimit <= RSI_LOWER_LIMIT_SETTING.max;
          rsiLowerLimit = getAddedNumber({
            number: rsiLowerLimit,
            addNumber: RSI_LOWER_LIMIT_SETTING.step,
            digit: 0
          })
        ) {
          settings.push({
            rsiPeriod,
            rsiUpperLimit,
            rsiLowerLimit,
            leverage
          });
        }
      }
    }
  }
  return settings;
};

const getRandomSettings = () => {
  const settings = getSettings();
  if (RANDOM_SAMPLE_NUMBER) {
    const samples = [];
    for (let i = 0; i < RANDOM_SAMPLE_NUMBER; i++) {
      const randomIndex = Math.floor(Math.random() * settings.length);
      samples.push(settings[randomIndex]);
    }
    return samples;
  }
  return settings;
};

export const getBestResult = async () => {
  const settings = getSettings();
  console.log("Total settings length", settings.length);
  const randomSettings = getRandomSettings();
  console.log("Random samples length", randomSettings.length);

  const progressBar = new SingleBar({}, Presets.shades_classic);
  progressBar.start(randomSettings.length, 0);

  let bestResult = { fund: 0 };

  for (const setting of randomSettings) {
    const { rsiPeriod, rsiUpperLimit, rsiLowerLimit, leverage } = setting;
    const backtestResult = await getBacktestResult({
      shouldLogResults: false,
      rsiPeriod,
      rsiUpperLimit,
      rsiLowerLimit,
      leverage
    });
    if (backtestResult && backtestResult.fund > bestResult.fund) {
      bestResult = backtestResult;
    }
    progressBar.increment();
  }

  progressBar.stop();

  return bestResult;
};
