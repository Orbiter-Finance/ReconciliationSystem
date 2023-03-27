const Router = require("koa-router");

const db = require("../model/index");
const fakerMakerTx = require("../model/fakerMakerTx");
const makerTx = require("../model/failMakerTransaction");
const txServices = require("../mock/txServices");
const bluebird = require("bluebird");
const _ = require("lodash");
const moment = require("moment");
const pairTable = require("../target.json");
const router = new Router();
const dashbroddb = require("../model/dashbroddb");
const constant = require('../constant');
const { getFormatDate } = require("../utils/index");

router.get("/newlist", async (ctx) => {
  let {
    current = 1,
    size = 10,
    fromTxHash,
    startTime: start,
    endTime: end,
    makerAddress,
    state,
    transactionId,
    fromChainId,
    toChainId
  } = ctx.query;
  current = Number(current);
  if (!current || current <= 0) {
    current = 1;
  }
  const skip = (current - 1) * size;
  const where = {};
  if (start && end) {
    where.createdAt = {
      $gt: new Date(Number(start)),
      $lte: new Date(Number(end)),
    };
  }
  if (transactionId) {
    where.inId = { $eq: Number(transactionId) };
  }
  state = Number(state);
  if (state === constant.state.successByMatched) {
    where.status = {
      $eq: "matched",
    };
  } else if (state === constant.state.successByAdmin) {
    where.confirmStatus = {
      $eq: constant.confirmStatus.successByAdmin,
    };
  } else if (state === constant.state.failByAdmin) {
    where.confirmStatus = {
      $eq: constant.confirmStatus.failByAdmin,
    };
  } else if (state === constant.state.failByMulti) {
    where.$and = [
      { status: "warning" },
      {
        confirmStatus: {
          $nin: [
            constant.confirmStatus.failByAdmin,
            constant.confirmStatus.successByAdmin,
          ],
        },
      },
    ];
  } else if (state === constant.state.failByUnknown) {
    where.$and = [
      { status: { $nin: ["matched", "warning"] } },
      {
        confirmStatus: {
          $nin: [
            constant.confirmStatus.failByAdmin,
            constant.confirmStatus.successByAdmin,
          ],
        },
      },
    ];
  }
  if (toChainId) {
    where.toChain = { $eq: toChainId }
  }
  if (fromChainId) {
    where.fromChain = { $eq: fromChainId }
  }

  console.log(JSON.stringify(where), skip, size);
  const docs = await makerTx.find(where).sort({ createdAt: -1 }).skip(skip).limit(size).lean();
  const count = await makerTx.count(where);
  await bluebird.map(
    docs,
    async (doc) => {
      // format state

      let state = constant.state.failByUnknown; // default fail
      const status = doc.status;
      const confirmStatus = doc.confirmStatus;
      if (status === "matched") {
        state = constant.state.successByMatched;
      } else {
        if (confirmStatus === constant.confirmStatus.successByAdmin) {
          state = constant.state.successByAdmin;
        } else if (confirmStatus === constant.confirmStatus.failByAdmin) {
          state = constant.state.failByAdmin;
        } else if (status === "warning") {
          state = constant.state.failByMulti;
        }
      }
      doc.state = state;

      doc.createdAt = getFormatDate(doc.createdAt);
      doc.updatedAt = getFormatDate(doc.updatedAt);

      // find user tx

      const inId = doc.inId;
      const sql = `SELECT * FROM transaction WHERE id = ${inId}`;
      const [r] = await dashbroddb.query(sql);
      if (r.length) {
        doc.inData = r[0];
        if (doc.inData?.createdAt) doc.inData.createdAt = getFormatDate(doc.inData.createdAt);
      }
    },
    { concurrency: 10 }
  );
  ctx.body = { data: docs, pages: current, code: 0, size, total: count };
});

router.get("/notMatchMakerTxList", async (ctx) => {
  let {
    current = 1,
    size = 10,
    startTime: start,
    endTime: end,
    makerAddress,
    state,
    chain,
  } = ctx.query;
  current = Number(current);
  if (!current || current <= 0) {
    current = 1;
  }

  const skip = (current - 1) * size;
  let bind_status = ["Error", "multi", "too_old"];
  if (["Error", "multi", "too_old"].includes(state)) {
    bind_status = [state];
  }
  const where = { bind_status: { $in: bind_status } };
  if (makerAddress) {
    where.fake_maker_address = makerAddress;
  }
  if (chain && constant.chainDesc.includes(chain)) {
    where.tx_env = { $eq: chain };
  }
  const txList = await fakerMakerTx.find(where).sort({ timestamp: -1 }).skip(skip).limit(size).lean();
  const count = await fakerMakerTx.count(where);
  ctx.body = { data: txList, pages: current, code: 0, size, total: count };
});

router.get("/statistic", async (ctx) => {
  let { startTime: start, endTime: end } = ctx.query;
  const where = {};
  if (start && end) {
    where.createdAt = {
      $gt: new Date(Number(start)),
      $lte: new Date(Number(end)),
    };
  }
  const successByMatchedWhere = { ...where, status: { $eq: "matched" } };
  const successByAdminCountWhere = {
    ...where,
    confirmStatus: { $eq: constant.confirmStatus.successByAdmin },
  };
  const failByAdminCountWhere = {
    ...where,
    confirmStatus: { $eq: constant.confirmStatus.failByAdmin },
  };
  const failByMultiAnd = [
    { status: "warning" },
    {
      confirmStatus: {
        $nin: [
          constant.confirmStatus.failByAdmin,
          constant.confirmStatus.successByAdmin,
        ],
      },
    },
  ];
  const failByMultiCountWhere = { ...where, $and: failByMultiAnd };
  let failByUnknownAnd = [
    { status: { $nin: ["matched", "warning"] } },
    {
      confirmStatus: {
        $nin: [
          constant.confirmStatus.failByAdmin,
          constant.confirmStatus.successByAdmin,
        ],
      },
    },
  ];
  const failByUnknownCountWhere = { ...where, $and: failByUnknownAnd };
  const tasks = [
    successByMatchedWhere,
    successByAdminCountWhere,
    failByAdminCountWhere,
    failByMultiCountWhere,
    failByUnknownCountWhere,
  ];
  const [
    successByMatchedCount,
    successByAdminCount,
    failByAdminCount,
    failByMultiCount,
    failByUnknownCount,
  ] = await bluebird.map(
    tasks,
    async (task) => {
      const count = await makerTx.count(task);
      return count;
    },
    { concurrency: 3 }
  );
  ctx.body = {
    data: {
      successByMatchedCount,
      successByAdminCount,
      failByAdminCount,
      failByMultiCount,
      failByUnknownCount,
    },
    code: 0,
  };
});
module.exports = router;
