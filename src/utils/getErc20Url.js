const ethAddress = {
  bsc: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
  polygon: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
};

const configs = {
  scan: {
    bsc: "https://api.bscscan.com/api",
    polygon: "https://api.polygonscan.com/api",
  },
  scanApikeyMap: {
    bsc: "211K4X2NZ82E633CKYG5UZJQHE4YVWB1RT",
    polygon: "KHBPYR3CMVA3PKRUY2EMQ5J18BXNZ3A691",
  },
};

const getUrl = function (makerTx) {
  const evn_map = {
    15: "bsc",
    6: "polygon",
  };

  const evn = evn_map[makerTx.toChain];

  if (!makerTx.replyAccount || !makerTx.toChain || !evn) {
    return undefined;
  }

  const url = configs.scan[evn];
  const key = configs.scanApikeyMap[evn];
  if (!url || !key) {
    return undefined;
  }

  return `${url}?module=account&action=tokentx&contractaddress=${ethAddress[evn]}&address=${makerTx.replyAccount}&page=1&offset=200&startblock=0&endblock=999999999&sort=desc&apikey=${key}`;
};

module.exports = getUrl;
