const makerTxModel = require("../model/failMakerTransaction");
const starknetTxModel = require("../model/starknetTx");
const zksyncliteTxModel = require("../model/zksyncliteTx");

const { BigNumber } = require("@ethersproject/bignumber");
const BigNumberJs = require("bignumber.js");
const axios = require("axios");
const init = require("../model/initMongodb");
const isMaker = require("../utils/isMaker");
const getScanUrl = require("../utils/getScanUrl");
const { isZksynclite, isStarknet, isZk2 } = require("../utils/is");

const checkStarknetTx = async function (makerTx) {
  if (!makerTx.replyAccount || !makerTx.toAmount) {
    return false;
  }

  const toAmount = makerTx.toAmount.slice(0, makerTx.toAmount.length - 4) + "0000";
  const matcheds = await starknetTxModel.find({
    "input.6": BigNumber.from(makerTx.replyAccount).toString(),
    "input.7": {
      $in: [BigNumber.from(toAmount).toString(), makerTx.toAmount],
    },
  });

  return matcheds;
};
const checkZk2Tx = async function (makerTx) {
  if (!makerTx.replyAccount || !makerTx.toAmount) {
    return false;
  }

  const matcheds = await zksyncliteTxModel.find({
    to: makerTx.replyAccount.toLowerCase(),
    value: "0x" + new BigNumberJs(makerTx.toAmount).toString(16),
  });

  return matcheds;
};

const checkOtherTx = async function (makerTx) {
  const url = getScanUrl(makerTx);

  if (!url || !makerTx.toAmount) {
    return undefined;
  }
  try {
    const res = await axios.get(url);
    console.log("url", url, makerTx.transcationId);
    if (isZksynclite(makerTx)) {
      if (res.data.status === "success" && Array.isArray(res.data.result.list)) {
        const list = res.data.result.list.filter((item) => {
          if (item.failReason !== null || item.op.type !== "Transfer") {
            return false;
          }
          if (BigNumber.from(makerTx.toAmount).eq(item.op.amount) && isMaker(item.op.from)) {
            return true;
          }
          return false;
        });
        return list;
      }
    } else {
      if (res.data.status === "1" && Array.isArray(res.data.result)) {
        const list = res.data.result.filter((item) => {
          if (BigNumber.from(makerTx.toAmount).eq(item.value) && isMaker(item.from)) {
            return true;
          }
          return false;
        });

        return list;
      }
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
      // $in: ["3"],
      // $in: ["14"],
      // $in: ["4"],
    },
    // transcationId: "0xdf2a93ddf2c91f93f804fb5018547882e88476a10006eth39",
    // transcationId: "0xc87e30b9e0dc1d1fb177cebc41eee0d6bdcb650b0002eth0",
  });

  console.log("fail length:", makerTxs.length);

  let findNum = 0;
  // let checkNum = 0;

  for (let index = 0; index < makerTxs.length; index++) {
    const makerTx = makerTxs[index];

    const res = isStarknet(makerTx)
      ? await checkStarknetTx(makerTx)
      : isZk2(makerTx)
      ? await checkZk2Tx(makerTx)
      : await checkOtherTx(makerTx);

    if (res && res.length === 1) {
      const [data] = res;
      await makerTxModel.findOneAndUpdate(
        { id: makerTx.id },
        {
          $set: {
            matchedScanTx: {
              ...data,
              hash: data.hash ? data.hash : data._id,
            },
            status: "matched",
          },
        }
      );
      console.log("更新 ：", findNum++);
      console.log("剩下没找到 ：", makerTxs.length - findNum);
    }

    if (res && res.length > 1) {
      await makerTxModel.findOneAndUpdate(
        { id: makerTx.id },
        {
          $set: {
            warnTxList: res.map((item) =>
              item.hash ? item.hash : item.txHash ? item.txHash : item._id
            ),
            status: "warning",
          },
        }
      );
      console.log("更新 ：", findNum++);
      console.log("剩下没找到 ：", makerTxs.length - findNum);
    }

    console.log("checked：", index);
  }
}

(async function () {
  await check();
})();

module.exports.getUrl = getUrl;
module.exports.isStarknet = isStarknet;
module.exports.isZksynclite = isZksynclite;
module.exports.check = check;
