const Koa = require('koa');
const initMongodb = require('./model/initMongodb')
const bodyParser = require('koa-bodyparser');
const app = new Koa();
const router = require('./controller/list')
const userRouter = require('./controller/user')
const static = require('koa-static')
const fetch = require('./job/fetch')
app.use(async (ctx, next)=> {
    ctx.set('Access-Control-Allow-Origin', '*');
    ctx.set('Access-Control-Allow-Headers', 'Content-Type, Content-Length, Authorization, Accept, X-Requested-With , yourHeaderFeild');
    ctx.set('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
    if (ctx.method == 'OPTIONS') {
      ctx.body = 200; 
    } else {
      await next();
    }
});
app.use(static('public'))
app.use(bodyParser());

app.use(router.routes())
app.use(userRouter.routes())

initMongodb().then(() => {
    // fetch.start()
    app.listen(3000, () => {
        console.log(`listening in 3000`)
    });
})