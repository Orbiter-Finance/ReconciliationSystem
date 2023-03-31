import {BigNumber} from 'bignumber.js'
import moment from 'moment'

export function isEqualsAddress(addressA, addressB) {
  try {
    if (addressA.toLowerCase() === addressB.toLowerCase()) {
      return true;
    }
    return new BigNumber(addressA).eq(new BigNumber(addressB));
  } catch (error) {
    return false;
  }
}

export function getFormatDate(date, timeZone = 8) {
  const timestamp = new Date(date || new Date().valueOf());
  // const timeZone = timeZone;
  return moment(timestamp).utcOffset(`${ timeZone < 0 ? "-" : "+" }${ Math.abs(timeZone) < 10 ? "0" + Math.abs(timeZone) : Math.abs(timeZone) }:00`).format("YYYY-MM-DD HH:mm:ss");
}

