const { env } = require("../config");
const Router = require("koa-router");
const router = new Router();
const user = require('../model/user');
const makerTx = require('../model/failMakerTransaction');
const userLog = require('../model/userLog');
const { encrypt, decrypt, md5 } = require('../utils/encrypt');

async function userMiddleware(ctx, next) {
    const { token, baseInfo } = await decrypt(ctx?.req?.headers?.token);
    if (token) {
        const info = JSON.parse(baseInfo);
        ctx.uid = info.id;
        ctx.role = info.role;
        await next();
    } else {
        ctx.body = { msg: 'Login has expired, please login again', code: 401, status: 401 };
    }
}

router.get("/submit", userMiddleware, async (ctx) => {
    const { makerTxId } = ctx.query;
    const status = +ctx.query.status;
    const { uid, role } = ctx;
    await userLog.updateOne({
        uid,
        makerTxId,
    }, { status, makerTxId, updateTime: new Date().valueOf() }, { upsert: true });
    const statusStr = status === 1 ? 'success' : 'fail';
    let confirmStatus = role === 1 ? `${ statusStr }ByAdmin` : `${ statusStr }ByOper`;
    if (status === 0) {
        confirmStatus = 'noConfirm';
    }
    await makerTx.updateOne({
        id: makerTxId
    }, { confirmStatus });

    ctx.body = { code: 0, msg: 'success' };
});

router.get("/login", async (ctx) => {
    const { name, password } = ctx.query;
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
    await user.updateOne({ id: usr.id }, {
        loginTime: new Date().valueOf()
    });
    const token = await encrypt(JSON.stringify({ id: usr.id, role: usr.role, name, random: Math.random() }));
    ctx.body = { code: 0, msg: 'success', data: { token } };
});

module.exports = router;
