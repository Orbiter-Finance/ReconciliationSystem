
import Router from 'koa-router'
import user from '../model/user'
import makerTx from '../model/failMakerTransaction'
import remarkModel from '../model/remark'
import { encrypt, decrypt, md5En } from '../utils/encrypt'
import * as constant from '../constant/index'
import bluebird from 'bluebird'
import _ from 'lodash';
import logger from '../utils/logger'
import { checkLogin } from '../service/user_service'
const router = new Router();


router.post("/submit", async (ctx) => {
    if (!await checkLogin(ctx)) {
        ctx.body = { msg: 'Login has expired, please login again', code: 401, status: 401 };
        return;
    }
    const body: any = ctx.request.body;
    let { makerTxId, hash, signature } = body;
    const status = +body.status;
    const { uid, name, role } = ctx as any;
    if (!makerTxId || (Array.isArray(makerTxId) && makerTxId.length < 1) || ![0,1,2,3,4,5].includes(status) || (!signature && status === 4)) {
        ctx.body = { code: 1, msg: 'Parameter error' };
        return;
    }
    if (!Array.isArray(makerTxId)) {
        makerTxId = [makerTxId]
    }
    makerTxId = _.uniq(makerTxId)
    const txList = await makerTx.find({
        id: { $in: makerTxId }
    });
    if (txList.length !== makerTxId.length) {
        ctx.body = { code: 1, msg: 'Someone transactions do not exist' };
        return;
    }
    for (const tx of txList) {
        if (tx.status === 'matched') {
            ctx.body = { code: 1, msg: 'Unable to operate a successful transaction' };
            return;
        }
    }
    if (status !== 3 && makerTxId.length > 1) {
        ctx.body = { code: 1, msg: 'Unable to operate Multiple transaction unless doubtByAdmin' };
        return
    }
    let confirmStatus;
    switch(status) {
        case 0: confirmStatus = constant.confirmStatus.noConfirm;break;
        case 1: confirmStatus = constant.confirmStatus.successByAdmin;break;
        case 2: confirmStatus = constant.confirmStatus.failByAdmin;break; // not auto reply
        case 3: confirmStatus = constant.confirmStatus.doubtByAdmin;break;
        case 4: confirmStatus = constant.confirmStatus.failByAdminAndAutoReply;break;
        case 5: confirmStatus = constant.confirmStatus.manualReplyByAdmin;break;
    }
    const userLog = { uid, name, hash, updateStatus: status, role, updateTime: new Date() };
    const updateData:any = { confirmStatus, userLog }
    if (status === 4) {
        updateData.signature = signature;
    }
    await bluebird.map(makerTxId, async (id) => {
        logger.info(`submit update, id: ${id}, updateData:${JSON.stringify(updateData)}`)
        await makerTx.updateOne({
            id: id,
        }, { $set: updateData })
    }, { concurrency: 2 });
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
