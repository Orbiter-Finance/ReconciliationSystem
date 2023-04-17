import Koa from 'koa'
import { initMongodb } from './model/initMongodb'
import { initUser } from './service/user_service'
import bodyParser from 'koa-bodyparser'
import router from './controller/list'
import userRouter from './controller/user'
import staticDir from 'koa-static'
import { node_env } from './config/index' 
import logger from './utils/logger'
import * as job from './job'
const app = new Koa();


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
app.use(staticDir('public'))
app.use(bodyParser());

app.use(async (ctx, next) => {
    // const routerPath = ctx.originalUrl.split("?")[0];
    try {
        const startTime = new Date().valueOf();
        await next();
        const excTime = new Date().valueOf() - startTime;
        logger.info(`${ ctx.originalUrl } ${ excTime }ms`);
    } catch (e: any) {
        const status = e.status || 500;
        // The detailed error content of the server 500 error is not returned to the client because it may contain sensitive information
        logger.error(ctx.originalUrl, e.message, e.stack);
        ctx.body = {
            code: 500,
            msg: node_env.isProd ? "Server internal error" : e.message,
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
    logger.info('----', node_env.isDev, node_env.isProd)
    if (node_env.isDev || node_env.isProd) {
        job.start();
        initUser();
    }
    app.listen(3000, () => {
        logger.info(`listening in 3000 port now`);
    });
});