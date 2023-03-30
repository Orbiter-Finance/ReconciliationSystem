const Koa = require('koa');
const initMongodb = require('./model/initMongodb')
const { initUser } = require('./service/user_service')
const bodyParser = require('koa-bodyparser');
const app = new Koa();
const router = require('./controller/list')
const userRouter = require('./controller/user')
const static = require('koa-static')
const fetch = require('./job/fetch')
const { env } = require("./config/index");
const configEnv = require("./config/env");
const logger = require('./utils/logger');

app.use(async (ctx, next)=> {
    ctx.set('Access-Control-Allow-Origin', '*');
    ctx.set('Access-Control-Allow-Headers', 'Content-Type, Content-Length, Authorization, Accept, X-Requested-With , token');
    ctx.set('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
    if (ctx.method == 'OPTIONS') {
      ctx.body = 200; 
    } else {
      await next();
    }
});
app.use(static('public'))
app.use(bodyParser());

app.use(async (ctx, next) => {
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
            msg: env.isProd ? "Server internal error" : e.message,
        };
        if (status === 422) {
            ctx.body.detail = e.errors;
        }
        ctx.status = status;
    }
});

app.use(router.routes())
app.use(userRouter.routes())

initMongodb().then(() => {
    if (env.isDev || env.isProd) {
        fetch.start();
        initUser();
    }
    app.listen(3000, () => {
        console.log(`listening in 3000`);
    });
});