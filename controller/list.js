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
const constant = require('../constant')

router.get("/newlist", async (ctx) => {
  let {
    current = 0,
    size = 10,
    fromTxHash,
    startTime: start,
    endTime: end,
    makerAddress,
    state,
  } = ctx.query;
  const skip = Number(current) * size;
  const where = {};
  if (start && end) {
    where.createdAt = {
      $gt: new Date(Number(start)),
      $lte: new Date(Number(end)),
    };
  }
  state = Number(state)
  if (state === constant.state.successByMatched) {
    where.status = {
      $eq: "matched",
    };
  } else if (state === constant.state.successByAdmin) {
    where.confirmStatus = {
      $eq: constant.confirmStatus.successByAdmin
    }
  } else if (state === constant.state.failByAdmin) {
    where.confirmStatus = {
      $eq: constant.confirmStatus.failByAdmin
    }
  } else if (state === constant.state.failByMulti) {
    where.$and = [
      { status: 'warning' },
      { confirmStatus: { $nin: [constant.confirmStatus.failByAdmin, constant.confirmStatus.successByAdmin] } }
    ]
  } else if(state === constant.state.failByUnknown) {
    where.$and = [
      { status: { $nin: [ "matched" , "warning"] } },
      { confirmStatus: { $nin: [constant.confirmStatus.failByAdmin, constant.confirmStatus.successByAdmin] } }
    ];
  }
  console.log(where)
  const docs = await makerTx.find(where).skip(skip).limit(size).lean();
  const count = await makerTx.count(where);
  await bluebird.map(
    docs,
    async (doc) => {

      // format state

      let state = constant.state.failByUnknown; // default fail
      const status = doc.status;
      const confirmStatus = doc.confirmStatus;
      if (status === 'matched') {
        state = constant.state.successByMatched;
      } else {
        if (confirmStatus === constant.confirmStatus.successByAdmin) {
          state = constant.state.successByAdmin;
        } else if (confirmStatus === constant.confirmStatus.failByAdmin) {
          state = constant.state.failByAdmin;
        } else if (status === 'warning') {
          state = constant.state.failByMulti;
        }
      }
      doc.state = state;

      // find user tx
      const inId = doc.inId;
      const sql = `SELECT * FROM transaction WHERE id = ${inId}`;
      const [r] = await dashbroddb.query(sql);
      if (r.length) {
        doc.inData = r[0];
      }
      
    },
    { concurrency: 10 }
  );
  ctx.body = { data: docs, pages: current, code: 0, size, total: count };
});

router.get("/notMatchMakerTxList", async (ctx) => {
  let {
    current = 0,
    size = 10,
    startTime: start,
    endTime: end,
    makerAddress,
    state,
  } = ctx.query;
  const skip = Number(current) * size;
  let bind_status = ["Error", "multi", "too_old"];
  if (["Error", "multi", "too_old"].includes(state)) {
    bind_status= [state]
  }
  const where = { bind_status: { $in: bind_status } };
  if (makerAddress) {
    where.fake_maker_address = makerAddress;
  }
  const txList = await fakerMakerTx.find(where).skip(skip).limit(size).lean();
  const count = await fakerMakerTx.count(where);
  ctx.body = { data: txList, pages: current, code: 0, size, total: count };
});

router.post("/update", async (ctx) => {
  const body = ctx.request.body;
  ctx.body = body;
});
module.exports = router;
