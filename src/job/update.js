const makerTxModel = require("../model/failMakerTransaction");
const getScanUrl = require("../utils/getScanUrl");
const init = require("../model/initMongodb");
const isMaker = require("../utils/isMaker");
const axios = require("axios");
const { BigNumber } = require("@ethersproject/bignumber");

const checkOtherTx = async function (makerTx) {
  const url = getScanUrl(makerTx);

  if (!url || !makerTx.toAmount) {
    return undefined;
  }
  try {
    const res = await axios.get(url);
    console.log("url", url, makerTx.transcationId);

    if (res.data.status === "1" && Array.isArray(res.data.result)) {
      const list = res.data.result.filter((item) => {
        if (BigNumber.from(makerTx.toAmount).eq(item.value) && isMaker(item.from)) {
          return true;
        }
        return false;
      });

      return list;
    }
    throw new Error(`res error ${res.data.status}`);
  } catch (error) {
    console.log("get scan data error", error);
    return undefined;
  }
};
(async function () {
  await init();

  const makerTxs = await makerTxModel.find({
    matchedScanTx: { $exists: true },
    toChain: "7",
    "matchedScanTx.hash": { $eq: null },
  });
  let findNum = 0;
  for (let index = 0; index < makerTxs.length; index++) {
    const makerTx = makerTxs[index];

    const res = await checkOtherTx(makerTx);

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
      console.log("update ：", findNum++);
      console.log("剩下没找到 ：", makerTxs.length - findNum);
    }
  }
})();
