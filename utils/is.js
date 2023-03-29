const isStarknet = function (makerTx) {
  if (makerTx.toChain && makerTx.toChain === "4") {
    return true;
  }
  return false;
};
const isZk2 = function (makerTx) {
  if (makerTx.toChain && makerTx.toChain === "14") {
    return true;
  }
  return false;
};
const isZksynclite = function (makerTx) {
  if (makerTx.toChain && makerTx.toChain === "3") {
    return true;
  }
  return false;
};
const isNova = function (makerTx) {
  if (makerTx.toChain && makerTx.toChain === "16") {
    return true;
  }
  return false;
};
const isBSC = function (makerTx) {
  if (makerTx.toChain && makerTx.toChain === "15") {
    return true;
  }
  return false;
};
const isPolygon = function (makerTx) {
  if (makerTx.toChain && makerTx.toChain === "6") {
    return true;
  }
  return false;
};

module.exports = {
  isStarknet,
  isZk2,
  isZksynclite,
  isNova,
  isBSC,
  isPolygon
};
