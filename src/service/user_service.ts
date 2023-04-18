import { Context } from 'koa'
import env from '../config/env'
import user from '../model/user'
import { md5En, decrypt } from '../utils/encrypt'
import logger from '../utils/logger';

export async function initUser() {
    let configEnv: any = env;
    const accountList = configEnv?.account || [];
    for (const account of accountList) {
        const password = md5En(account.password);
        const name = account.name;
        const role = +account.role || 2;
        const count = await user.count({
            name,
        });
        if (!count) {
            await user.create({ name, password, role, status: 1 });
            logger.info('Register user', name);
        } else {
            await user.findOneAndUpdate({ name }, { password, role })
            logger.info('Update user', name);
        }
    }
}

export async function checkLogin(ctx: Context) {
    const body = <{ token?: string }>ctx.request.body
    const query = <{ token?: string }>ctx.query
    const tokenStr = ctx.header['token'] as string || body.token || query.token
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