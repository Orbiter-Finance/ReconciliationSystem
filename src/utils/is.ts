export const isStarknet = function (makerTx) {
    if (makerTx.toChain && makerTx.toChain === "4") {
      return true;
    }
    return false;
  };
export const isZk2 = function (makerTx) {
    if (makerTx.toChain && makerTx.toChain === "14") {
      return true;
    }
    return false;
  };
export const isZksynclite = function (makerTx) {
    if (makerTx.toChain && makerTx.toChain === "3") {
      return true;
    }
    return false;
  };
export const isNova = function (makerTx) {
    if (makerTx.toChain && makerTx.toChain === "16") {
      return true;
    }
    return false;
};
export const isBSC = function (makerTx) {
    if (makerTx.toChain && makerTx.toChain === "15") {
      return true;
    }
    return false;
}
export const isPolygon = function (makerTx) {
    if (makerTx.toChain && makerTx.toChain === "6") {
      return true;
    }
    return false;
  };
  
export const isArbNova = function (makerTx) {
    if (makerTx.toChain && makerTx.toChain === "16") {
      return true;
    }
    return false;
}