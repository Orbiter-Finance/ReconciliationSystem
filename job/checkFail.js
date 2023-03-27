const makerTxModel = require("../model/failMakerTransaction");
const starknetTxModel = require("../model/starknetTx");
const { BigNumber } = require("bignumber.js");
const axios = require("axios");
const init = require("../model/initMongodb");

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

const isStarknet = function (makerTx) {
  if (makerTx.toChain && makerTx.toChain === "4") {
    return true;
  }
  return false;
};
const checkStarknetTx = async function (makerTx) {
  if (!makerTx.replyAccount || !makerTx.toAmount) {
    return false;
  }
  const matcheds = await starknetTxModel.find({
    "input.6": new BigNumber(makerTx.replyAccount).toString(),
    "input.7": new BigNumber(makerTx.toAmount).toString(),
  });
  console.log("starknet", makerTx.transcationId, makerTx.toAmount);
  if (matcheds.length && matcheds.length === 1) {
    return matcheds[0];
  }

  return false;
};

const getUrl = function (makerTx) {
  const evn_map = {
    1: "ethereum",
    2: "arbitrum",
    3: "zksynclite",
    7: "optimism",
    15: "bsc",
    14: "zksyncera",
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

  return `${url}?module=account&action=txlist&address=${makerTx.replyAccount}&startblock=0&endblock=99999999&page=1&offset=200&sort=asc&apikey=${key}`;
};
const checkOtherTx = async function (makerTx) {
  const url = getUrl(makerTx);

  if (!url || !makerTx.toAmount) {
    return undefined;
  }
  try {
    const res = await axios.get(url);
    console.log("url", url, makerTx.transcationId);
    if (res.data.status === "1" && Array.isArray(res.data.result)) {
      const list = res.data.result.filter((item) => {
        if (new BigNumber(makerTx.toAmount).eq(item.value)) {
          return true;
        }
        return false;
      });

      if (list.length && list.length === 1) {
        return list[0];
      }
      return undefined;
    }
    throw new Error(`res error ${res.data.status}`);
  } catch (error) {
    console.log("get scan data error", error);
    return undefined;
  }
};

async function check() {
  await init();

  const makerTxs = await makerTxModel.find({
    status: { $nin: ["matched", "warning"] },
    matchedScanTx: { $exists: false },
    toChain: {
      $in: ["4", "3", "14"],
    },
  });

  console.log("fail length:", makerTxs.length);

  let findNum = 0;
  let checkNum = 0;

  for (let index = 0; index < makerTxs.length; index++) {
    const makerTx = makerTxs[index];
    const res = isStarknet(makerTx) ? await checkStarknetTx(makerTx) : await checkOtherTx(makerTx);
    // console.log("checkNum ：", checkNum++);
    if (res) {
      await makerTxModel.findOneAndUpdate(
        { id: makerTx.id },
        {
          matchedScanTx: res,
        }
      );
      console.log("update ：", findNum++);
      console.log("剩下没找到 ：", makerTxs.length - findNum);
    }
  }
}

// (async function () {
//   await check();
// })();

module.exports = check;
