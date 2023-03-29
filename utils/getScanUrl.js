const { isZksynclite } = require("./is");

const configs = {
  scan: {
    arbitrum: "https://api.arbiscan.io/api",
    ethereum: "https://api.etherscan.io/api",
    optimism: "https://api-optimistic.etherscan.io/api",
    bsc: "https://api.bscscan.com/api",
    polygon: "https://api.polygonscan.com/api",
    boba: "https://andromeda-explorer.metis.io/api",
  },
  scanApikeyMap: {
    arbitrum: "3SSTJW5DHYKUGQIC6ECFVPJZJKI31KSUR8",
    ethereum: "2634DC5NYXAD6T1W65Y8M57GWX49JHM76M",
    optimism: "XMD67QU4DSRKQCCVEEZ8HYZIQF82293K7P",
    bsc: "211K4X2NZ82E633CKYG5UZJQHE4YVWB1RT",
    polygon: "KHBPYR3CMVA3PKRUY2EMQ5J18BXNZ3A691",
    boba: "PEZQ5P13NE7ZX8HH3YCH59IPGHEMBEKN3D",
  },
};


const getUrl = function (makerTx) {
  if (isZksynclite(makerTx)) {
    return `https://api.zksync.io/api/v0.2/accounts/${makerTx.replyAccount}/transactions?from=latest&limit=100&direction=older`;
  }

  const evn_map = {
    1: "ethereum",
    2: "arbitrum",
    7: "optimism",
    15: "bsc",
    4: "starknet",
    66: "polygon",
  };

  if (!makerTx.replyAccount || !makerTx.toChain || !evn_map[makerTx.toChain]) {
    return undefined;
  }

  const url = configs.scan[evn_map[makerTx.toChain]];
  const key = configs.scanApikeyMap[evn_map[makerTx.toChain]];
  if (!url || !key) {
    return undefined;
  }

  return `${url}?module=account&action=txlist&address=${makerTx.replyAccount}&startblock=0&endblock=99999999&page=1&offset=200&sort=desc&apikey=${key}`;
};

module.exports = getUrl