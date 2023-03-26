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
router.get("/list", async (ctx) => {
  let {
    current = 0,
    size = 10,
    fromTxHash,
    startTime: start,
    endTime: end,
    makerAddress,
    state,
  } = ctx.query;
  let sql = `SELECT * FROM transaction WHERE 1=1`;
  let countSql = `SELECT COUNT(*) as count FROM transaction WHERE 1=1`;
  let where = ``;
  if (start) {
    // start = moment(Number(start)).format('YYYY-MM-DD HH:mm:ss')
    where += ` AND fromTimeStamp >= '${start}'`;
  }
  if (end) {
    // end = moment(Number(end)).format('YYYY-MM-DD HH:mm:ss')
    where += ` AND fromTimeStamp < '${end}'`;
  }
  if (makerAddress) {
    where += ` AND makerAddress='${makerAddress}'`;
  }
  if (Number(state) === 20) {
    where += ` AND updateStatus=0`;
  } else if (Number(state) === 3) {
    where += ` AND updateStatus=1`;
  }
  countSql += where;
  sql += where;
  sql += ` LIMIT ${size} OFFSET ${Number(current) * Number(size)}`;
  console.log(sql);
  console.log(countSql);
  let [list] = await db.query(sql);
  let [[result]] = await db.query(countSql);
  console.log("-------list", list.length, result);
  const failList = _.filter(list, (item) => item.updateStatus === 0);
  console.log("-----------------------", failList.length);
  if (failList.length) {
    const failTranscationIdList = _.map(failList, "transcationId").map((item) =>
      item.toLowerCase()
    );
    console.log("----failTranscationIdList:", failTranscationIdList[0]);
    const targetPairTableList = _.filter(pairTable, (item) =>
      failTranscationIdList.includes(item.transcationId.toLowerCase())
    );
    const has = pairTable.some((item) => item.transcationId.toLowerCase());

    console.log("-----targetPairTableList：", targetPairTableList);
    const transcationIdToTxHash = {};
    targetPairTableList.forEach((item) => {
      transcationIdToTxHash[item.transcationId] = item.result.hash;
    });
    const fakemakerTxHashList = _.map(targetPairTableList, "fromTxHash");
    const fakemakerTxList = await fakerMakerTx.find({
      _id: { $in: fakemakerTxHashList },
    });
    console.log(
      "------------------------fakemakerTxList:",
      fakemakerTxList.length
    );
    await bluebird.map(
      list,
      async (item) => {
        if (
          failTranscationIdList.includes(item.transcationId) &&
          fakemakerTxList.find(
            (item1) =>
              item1.tx_hash === transcationIdToTxHash[item.transcationId]
          )
        ) {
          console.log("--------------------item:", item.transcationId);
          item.status = 99;
          tem.fromStatus = 99;
          const updateSql = `UPDATE transaction SET updateStatus=1 where transcationId = ${item.transcationId}`;
          // await db.query(updateSql);
        }
      },
      { concurrency: 10 }
    );
  }

  ctx.body = { data: list, pages: current, code: 0, size, total: result.count };
  console.log(ctx.body.total, result.count);
});

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
  if (Number(state) === 20) {
    where.status = {
      $eq: "matched",
    };
  } else if (Number(state) === 3) {
    where.$and = [
      { status: { $ne: "matched" } },
      { status: { $ne: "warning" } },
    ];
  }
  const docs = await makerTx.find(where).skip(skip).limit(size).lean();
  const count = await makerTx.count(where);
  await bluebird.map(
    docs,
    async (doc) => {
      const inId = doc.inId;
      const sql = `SELECT * FROM transaction WHERE id = ${inId}`;
      // console.log('------------', sql)
      const [r] = await dashbroddb.query(sql);
      if (r.length) {
        doc.inData = r[0];
      }
      // console.log('---------docs', doc)
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
  } = ctx.query;
  const skip = Number(current) * size;
  const where = { bind_status: { $in: ["Error", "multi"] } };
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
