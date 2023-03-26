const { BigNumber } = require("bignumber.js");

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

module.exports.isEqualsAddress = isEqualsAddress;
