const { env } = require("../config");
const Router = require("koa-router");
const router = new Router();
const user = require('../model/user');
const makerTx = require('../model/failMakerTransaction');
const logger = require('../utils/logger');
const userLog = require('../model/userLog');
const { encrypt, decrypt } = require('../utils/encrypt');

router.use(async (ctx, next) => {
    const routerPath = ctx.originalUrl.split("?")[0];
    try {
        const startTime = new Date().valueOf();
        await next();
        const excTime = new Date().valueOf() - startTime;
        logger.input(`${ routerPath } ${ excTime }ms`);
    } catch (e) {
        const status = e.status || 500;
        // The detailed error content of the server 500 error is not returned to the client because it may contain sensitive information
        logger.error(routerPath, e.message, e.stack);
        ctx.body = {
            code: 500,
            msg: env.isLocal ? e.message : "Server internal error",
        };
        if (status === 422) {
            ctx.body.detail = e.errors;
        }
        ctx.status = status;
    }
});

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
    const {
        makerTxId,
        status
    } = ctx.query;
    const { uid, role } = ctx;
    await userLog.updateOne({
        uid,
        makerTxId,
    }, { status, makerTxId, updateTime: new Date().valueOf() }, { upsert: true });
    const statusStr = status === 1 ? 'success' : 'fail';
    const confirmStatus = role === 1 ? `${ statusStr }ByAdmin` : `${ statusStr }ByOper`;
    await makerTx.updateOne({
        id: makerTxId
    }, { confirmStatus });

    ctx.body = { code: 0, msg: 'success' };
});

router.get("/login", async (ctx) => {
    const { name, password } = ctx.query;
    const usr = await user.findOneAndUpdate({
        name,
        password,
        loginTime: new Date().valueOf()
    });
    if (!usr) {
        ctx.body = { code: 1, msg: 'User name or password error' };
        return;
    }
    if (!usr.status) {
        ctx.body = { code: 1, msg: 'Account has been disabled' };
        return;
    }
    const token = encrypt(JSON.stringify({ id: usr.id, role: usr.role, name, random: Math.random() }));
    ctx.body = { code: 0, msg: 'success', data: { token } };
});

module.exports = router;
