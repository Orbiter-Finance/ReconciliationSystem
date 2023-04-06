
import Router from 'koa-router'
import user from '../model/user'
import makerTx from '../model/failMakerTransaction'
import remarkModel from '../model/remark'
import { encrypt, decrypt, md5En } from '../utils/encrypt'
const constant = require('../constant/index')
const router = new Router();
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
    const body: any = ctx.request.body;
    const { makerTxId, hash, signature } = body;
    const status = +body.status;
    const { uid, name, role } = ctx as any;
    if (!makerTxId || ![0,1,2,3].includes(status) || (!signature && status === 2)) {
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
    let confirmStatus;
    switch(status) {
        case 0: confirmStatus = constant.confirmStatus.noConfirm;break;
        case 1: confirmStatus = constant.confirmStatus.successByAdmin;break;
        case 2: confirmStatus = constant.confirmStatus.failByAdmin;break;
        case 3: confirmStatus = constant.confirmStatus.doubtByAdmin;break;
    }
    const userLog = { uid, name, hash, updateStatus: status, role, updateTime: new Date() };
    const updateData:any = { confirmStatus, userLog }
    if (status === 2) {
        updateData.signature = signature;
    }
    await makerTx.updateOne({
        id: makerTxId,
    }, { $set: updateData });
    ctx.body = { code: 0, msg: 'success' };
});


router.post("/remarkSubmit", async (ctx) => {
    if (!await checkLogin(ctx)) {
        ctx.body = { msg: 'Login has expired, please login again', code: 401, status: 401 };
        return;
    }
    const body: any = ctx.request.body
    const { transactionId, remark } = body
    const { name, role } = ctx as any;
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
    const body: any = ctx.request.body;
    const { name, password } = body;
    const usr = await user.findOne({
        name,
        password: md5En(password)
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

export default router;
