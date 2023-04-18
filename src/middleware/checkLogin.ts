import { Context, Next } from 'koa';
import { checkLogin } from '../service/user_service' 

export default async function checkLoginMiddleware(ctx: Context, next: Next) {
    if (!await checkLogin(ctx)) {
        ctx.body = { msg: 'Login has expired, please login again', code: 401, status: 401 };
        return;
    }
    await next()
}