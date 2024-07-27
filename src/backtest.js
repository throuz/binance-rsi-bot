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

const getLogColor = (finalPnl) => {
  const logRedColor = "\x1b[31m";
  const logGreenColor = "\x1b[32m";
  return finalPnl > 0 ? logGreenColor : logRedColor;
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
  finalFund,
  positionType,
  openPrice,
  closePrice,
  openTimestamp,
  closeTimestamp
}) => {
  const finalPnl = finalFund - fund;
  const logResetColor = "\x1b[0m";
  const logColor = getLogColor(finalPnl);
  const formatedFund = finalFund.toFixed(2);
  const pnlPercentage = toPercentage(finalPnl / fund);
  const holdTimeHours = calculateHours(openTimestamp, closeTimestamp);
  const startTime = getReadableTime(openTimestamp);
  const endTime = getReadableTime(closeTimestamp);
  console.log(
    `${logColor}Fund: ${formatedFund} ${positionType} [${openPrice} ~ ${closePrice}] (${pnlPercentage}) [${startTime} ~ ${endTime}] (${holdTimeHours} hrs)${logResetColor}`
  );
};

const getFundingFee = ({ positionFund, openTimestamp, closeTimestamp }) => {
  const timeDifference = closeTimestamp - openTimestamp;
  const hours = timeDifference / (1000 * 60 * 60);
  const times = Math.floor(hours / 8);
  const fundingFee = positionFund * FUNDING_RATE * times;
  return fundingFee;
};

export const getBacktestResult = async ({
  shouldLogResults,
  rsiPeriod,
  rsiLongLevel,
  rsiShortLevel,
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
  const cachedRsiData = await getCachedRsiData();
  const rsiData = cachedRsiData.get(rsiPeriod);
  for (let i = RSI_PERIOD_SETTING.max + 1; i < cachedKlineData.length; i++) {
    const curKline = cachedKlineData[i];
    const preRsi = rsiData[i - 1];
    const signal = await getSignal({
      positionType,
      preRsi,
      rsiLongLevel,
      rsiShortLevel
    });
    const openLong = () => {
      positionFund = fund * ((ORDER_AMOUNT_PERCENT - 1) / 100) * leverage; // Actual tests have found that typically 1% less
      const fee = positionFund * FEE;
      fund = fund - fee;
      positionType = "LONG";
      openTimestamp = curKline.openTime;
      openPrice = curKline.openPrice;
      liquidationPrice = openPrice * (1 - 1 / leverage + 0.01); // Actual tests have found that typically 1% deviation
      quantity = positionFund / openPrice;
    };
    const openShort = () => {
      positionFund = fund * ((ORDER_AMOUNT_PERCENT - 1) / 100) * leverage; // Actual tests have found that typically 1% less
      const fee = positionFund * FEE;
      fund = fund - fee;
      positionType = "SHORT";
      openTimestamp = curKline.openTime;
      openPrice = curKline.openPrice;
      liquidationPrice = openPrice * (1 + 1 / leverage - 0.01); // Actual tests have found that typically 1% deviation
      quantity = positionFund / openPrice;
    };
    const closeLong = () => {
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
      const finalFund = fund + pnl - fee - fundingFee;
      if (shouldLogResults) {
        logTradeResult({
          fund,
          finalFund,
          positionType,
          openPrice,
          closePrice,
          openTimestamp,
          closeTimestamp
        });
      }
      fund = finalFund;
      positionType = "NONE";
      positionFund = null;
      openTimestamp = null;
      openPrice = null;
      liquidationPrice = null;
      quantity = null;
    };
    const closeShort = () => {
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
      const finalFund = fund + pnl - fee + fundingFee;
      if (shouldLogResults) {
        logTradeResult({
          fund,
          finalFund,
          positionType,
          openPrice,
          closePrice,
          openTimestamp,
          closeTimestamp
        });
      }
      fund = finalFund;
      positionType = "NONE";
      positionFund = null;
      openTimestamp = null;
      openPrice = null;
      liquidationPrice = null;
      quantity = null;
    };
    if (signal === "OPEN_LONG") {
      openLong();
    }
    if (signal === "OPEN_SHORT") {
      openShort();
    }
    if (signal === "LONG_TO_SHORT") {
      closeLong();
      openShort();
    }
    if (signal === "SHORT_TO_LONG") {
      closeShort();
      openLong();
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

  for (const setting of randomSettings) {
    const { rsiPeriod, rsiLongLevel, rsiShortLevel, leverage } = setting;
    const backtestResult = await getBacktestResult({
      shouldLogResults: false,
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
