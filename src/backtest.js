import { Presets, SingleBar } from "cli-progress";
import {
  RSI_PERIOD_SETTING,
  RSI_SHORT_LEVEL_SETTING,
  FEE,
  FUNDING_RATE,
  INITIAL_FUNDING,
  RSI_LONG_LEVEL_SETTING,
  LEVERAGE_SETTING,
  ORDER_AMOUNT_PERCENT,
  RANDOM_SAMPLE_NUMBER
} from "../configs/trade-config.js";
import { getCachedKlineData, getCachedRsiData } from "./cached-data.js";
import { getSignal } from "./signal.js";
import { getStepSize, formatBySize } from "./helpers.js";

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

const getLogColor = (pnl) => {
  const logRedColor = "\x1b[31m";
  const logGreenColor = "\x1b[32m";
  return pnl > 0 ? logGreenColor : logRedColor;
};

const toPercentage = (number) => {
  return `${Math.round(number * 100)}%`;
};

const calculateHours = (openTimestamp, closeTimestamp) => {
  const differenceInMilliseconds = closeTimestamp - openTimestamp;
  const hours = differenceInMilliseconds / (1000 * 60 * 60);
  return hours;
};

const logTradeResult = ({
  fund,
  positionFund,
  pnl,
  positionType,
  openPrice,
  closePrice,
  openTimestamp,
  closeTimestamp
}) => {
  const finalFund = fund + positionFund + pnl;
  const logResetColor = "\x1b[0m";
  const logColor = getLogColor(pnl);
  const formatedFund = finalFund.toFixed(2);
  const pnlPercentage = toPercentage(pnl / positionFund);
  const holdTimeHours = calculateHours(openTimestamp, closeTimestamp);
  const startTime = getReadableTime(openTimestamp);
  const endTime = getReadableTime(closeTimestamp);
  console.log(
    `${logColor}Fund: ${formatedFund} ${positionType} [${openPrice} ~ ${closePrice}] (${pnlPercentage}) [${startTime} ~ ${endTime}] (${holdTimeHours} hrs)${logResetColor}`
  );
};

const getFundingFee = ({
  positionAmt,
  closePrice,
  openTimestamp,
  closeTimestamp
}) => {
  const timeDifference = closeTimestamp - openTimestamp;
  const hours = timeDifference / (1000 * 60 * 60);
  const times = Math.floor(hours / 8);
  const fundingFee = positionAmt * closePrice * FUNDING_RATE * times;
  return fundingFee;
};

export const getBacktestResult = ({
  shouldLogResults,
  cachedKlineData,
  cachedRsiData,
  stepSize,
  rsiPeriod,
  rsiLongLevel,
  rsiShortLevel,
  leverage
}) => {
  let fund = INITIAL_FUNDING;
  let positionType = "NONE";
  let positionAmt = null;
  let positionFund = null;
  let openTimestamp = null;
  let openPrice = null;
  let liquidationPrice = null;
  const rsiData = cachedRsiData.get(rsiPeriod);
  for (let i = RSI_PERIOD_SETTING.max + 1; i < cachedKlineData.length; i++) {
    const curKline = cachedKlineData[i];
    const preRsi = rsiData[i - 1];
    const signal = getSignal({
      positionType,
      preRsi,
      rsiLongLevel,
      rsiShortLevel
    });
    if (signal === "OPEN_LONG") {
      openPrice = curKline.openPrice;
      const orderQuantity =
        (fund * (ORDER_AMOUNT_PERCENT / 100) * leverage) / openPrice;
      positionAmt = formatBySize(orderQuantity, stepSize);
      const fee = positionAmt * openPrice * FEE;
      positionFund = (positionAmt * openPrice) / leverage;
      fund = fund - positionFund - fee;
      positionType = "LONG";
      openTimestamp = curKline.openTime;
      liquidationPrice = openPrice * (1 - 1 / leverage);
    }
    if (signal === "CLOSE_LONG") {
      const closePrice = curKline.openPrice;
      const closeTimestamp = curKline.openTime;
      const fee = positionAmt * closePrice * FEE;
      const fundingFee = getFundingFee({
        positionAmt,
        closePrice,
        openTimestamp,
        closeTimestamp
      });
      const pnl = (closePrice - openPrice) * positionAmt - fee - fundingFee;
      if (shouldLogResults) {
        logTradeResult({
          fund,
          positionFund,
          pnl,
          positionType,
          openPrice,
          closePrice,
          openTimestamp,
          closeTimestamp
        });
      }
      fund = fund + positionFund + pnl;
      positionType = "NONE";
      positionAmt = null;
      positionFund = null;
      openTimestamp = null;
      openPrice = null;
      liquidationPrice = null;
    }
    // Liquidation
    if (positionType === "LONG" && curKline.lowPrice < liquidationPrice) {
      return null;
    }
  }
  return {
    currentPositionType: positionType,
    fund,
    rsiPeriod,
    rsiLongLevel,
    rsiShortLevel,
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
        let rsiLongLevel = RSI_LONG_LEVEL_SETTING.min;
        rsiLongLevel <= RSI_LONG_LEVEL_SETTING.max;
        rsiLongLevel = getAddedNumber({
          number: rsiLongLevel,
          addNumber: RSI_LONG_LEVEL_SETTING.step,
          digit: 0
        })
      ) {
        for (
          let rsiShortLevel = RSI_SHORT_LEVEL_SETTING.min;
          rsiShortLevel <= RSI_SHORT_LEVEL_SETTING.max;
          rsiShortLevel = getAddedNumber({
            number: rsiShortLevel,
            addNumber: RSI_SHORT_LEVEL_SETTING.step,
            digit: 0
          })
        ) {
          settings.push({
            rsiPeriod,
            rsiLongLevel,
            rsiShortLevel,
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

  const [cachedKlineData, cachedRsiData, stepSize] = await Promise.all([
    getCachedKlineData(),
    getCachedRsiData(),
    getStepSize()
  ]);

  for (const setting of randomSettings) {
    const { rsiPeriod, rsiLongLevel, rsiShortLevel, leverage } = setting;
    const backtestResult = getBacktestResult({
      shouldLogResults: false,
      cachedKlineData,
      cachedRsiData,
      stepSize,
      rsiPeriod,
      rsiLongLevel,
      rsiShortLevel,
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
