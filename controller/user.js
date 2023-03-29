const { env } = require("../config");
const Router = require("koa-router");
const router = new Router();
const user = require('../model/user');
const makerTx = require('../model/failMakerTransaction');
const remarkModel = require('../model/remark');
const { encrypt, decrypt, md5 } = require('../utils/encrypt');

// async function userMiddleware(ctx, next) {
//     const { token, baseInfo } = await decrypt(ctx?.req?.headers?.token);
//     if (token) {
//         const info = JSON.parse(baseInfo);
//         ctx.uid = info.id;
//         ctx.role = info.role;
//         await next();
//     } else {
//         ctx.body = { msg: 'Login has expired, please login again', code: 401, status: 401 };
//     }
// }

async function checkLogin(ctx) {
    const tokenStr = ctx.header['token'] || ctx.request.body.token || ctx.query.token
    const { token, baseInfo } = await decrypt(tokenStr);
    if (token) {
        const info = JSON.parse(baseInfo);
        ctx.uid = info.id;
        ctx.name = info.name;
        ctx.role = info.role;
        return true
    } else {
        return false
    }
}

router.post("/submit", async (ctx) => {
    if (!await checkLogin(ctx)) {
        ctx.body = { msg: 'Login has expired, please login again', code: 401, status: 401 };
        return;
    }
    const { makerTxId, hash } = ctx.request.body;
    const status = +ctx.request.body.status;
    const { uid, name, role } = ctx;
    if (!makerTxId) {
        ctx.body = { code: 1, msg: 'Parameter error' };
        return;
    }
    const tx = await makerTx.findOne({
        id: makerTxId
    });
    if(!tx){
        ctx.body = { code: 1, msg: 'Transactions do not exist' };
        return;
    }
    if (tx.status === 'matched') {
        ctx.body = { code: 1, msg: 'Unable to operate a successful transaction' };
        return;
    }
    const statusStr = status === 1 ? 'success' : 'fail';
    let confirmStatus = `${ statusStr }ByAdmin`;
    if (status === 0) {
        confirmStatus = 'noConfirm';
    }
    const userLog = { uid, name, hash, updateStatus: status, role, updateTime: new Date().valueOf() };
    await makerTx.updateOne({
        id: makerTxId,
    }, { $set: { confirmStatus, userLog } });

    ctx.body = { code: 0, msg: 'success' };
});


router.post("/remarkSubmit", async (ctx) => {
    if (!await checkLogin(ctx)) {
        ctx.body = { msg: 'Login has expired, please login again', code: 401, status: 401 };
        return;
    }
    const { transactionId, remark } = ctx.request.body;
    const { name, role } = ctx;
    if (!transactionId || !remark) {
        ctx.body = { code: 1, msg: 'Parameter error' };
        return;
    }
    const tx = await makerTx.findOne({
        transcationId: transactionId
    });
    if(!tx){
        ctx.body = { code: 1, msg: 'Transactions do not exist' };
        return;
    }
    const remarkDoc = {
        createdAt: new Date(),
        transactionId,
        role,
        userName: name,
        remark
    }
    const result = await remarkModel.create(remarkDoc)
    ctx.body = { code: 0, data: result }
});

router.post("/login", async (ctx) => {
    const { name, password } = ctx.request.body;
    const usr = await user.findOne({
        name,
        password: md5(password)
    });
    if (!usr) {
        ctx.body = { code: 1, msg: 'User name or password error' };
        return;
    }
    if (!usr.status) {
        ctx.body = { code: 1, msg: 'Account has been ban' };
        return;
    }
    await user.updateOne({ _id: usr._id }, {
        loginTime: new Date().valueOf()
    });
    const token = await encrypt(JSON.stringify({ id: usr._id, role: usr.role, name, random: Math.random() }));
    ctx.body = { code: 0, msg: 'success', data: { token } };
});

module.exports = router;
