const { BigNumber } = require("bignumber.js");
const moment = require("moment");

function isEqualsAddress(addressA, addressB) {
  try {
    if (addressA.toLowerCase() === addressB.toLowerCase()) {
      return true;
    }
    return new BigNumber(addressA).eq(new BigNumber(addressB));
  } catch (error) {
    return false;
  }
}

function getFormatDate(date) {
  const timestamp = new Date(date || new Date().valueOf());
  const timeZone = 8;
  return moment(timestamp).utcOffset(`${ timeZone < 0 ? "-" : "+" }${ Math.abs(timeZone) < 10 ? "0" + Math.abs(timeZone) : Math.abs(timeZone) }:00`).format("YYYY-MM-DD HH:mm:ss");
}

module.exports.isEqualsAddress = isEqualsAddress;
module.exports.getFormatDate = getFormatDate;
