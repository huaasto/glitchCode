const Koa = require('koa');
const Router = require('koa-router');
const serve = require('koa-static');
const fs = require('fs')
const axios = require('axios')
const app = new Koa();
var router = new Router();
const { queryPostData } = require('./utils/public')
const md5 = require('md5')
const { setToken } = require('./utils/req')


const issue = require('./api/issue')



var githubToken = ''

const tokenRepository = {
  powerfultoken: { id: 'powerfultoken', time: new Date('3000-1-1').getTime() }
}

// logger

app.use(async (ctx, next) => {
  await next();
});

// x-response-time

app.use(async (ctx, next) => {
  const token = ctx.req.headers.token
  if (ctx.req.method === 'POST' && !dealToken({ token })) {
    ctx.body = {
      code: 403,
      message: "fail to identify visitor"
    }
  } else {
    await next();
  }

});

router.get('/', async (ctx, next) => {
  // ctx.router available
  ctx.type = 'html'
  ctx.body = await fs.createReadStream('./dist/index.html');
})

// router.get('/main', async (ctx, next) => {
//   // ctx.router available
//   ctx.type = 'html'
//   ctx.body = await fs.createReadStream('./pages/mainpage.html');
// })

router.get('/login', async (ctx, next) => {
  // ctx.router available
  if (!ctx.query.code) {
    ctx.redirect("https://github.com/login/oauth/authorize?client_id=b3ca02c369a385486e40&scope=repo")
  } else {
    clearExpiredToken()
    const result = await getGithubToken(ctx.query.code)
    console.log(result)
    githubToken = result.access_token
    ctx.type = 'html'
    ctx.body = await fs.createReadStream('./pages/login.html');
  }

})

router.post('/login', async (ctx, next) => {
  // ctx.router available
  const data = await queryPostData(ctx)
  const token = ctx.req.headers.token
  console.log({ ...data, token })
  if (dealToken({ ...data, token })) {
    tokenRepository[md5(data.visitor + Date.now())] = { id: md5(data.visitor + Date.now()), time: Date.now() }
    console.log(tokenRepository)
    ctx.body = { code: 0, message: "success", token: md5(data.visitor + Date.now()), githubToken: githubToken };
  } else {
    ctx.body = {
      code: 403,
      message: "fail to identify visitor"
    }
  }
})

router.post('/getGithubToken', async (ctx, next) => {
  const data = await queryPostData(ctx)
  const result = await getGithubToken(data.code)
  ctx.body = result
})

router.use('/issue', issue);


app
  .use(router.routes())
  .use(router.allowedMethods())
  .use(serve('dist'));

app.listen(3000);

function dealToken({ visitor, pwd, token }) {
  // v:david p:123456
  console.log('dealToken', 'token:' + token, "visitor:" + md5('b3ca02c369a385486e40_' + visitor + pwd))
  console.log(md5('b3ca02c369a385486e40_david123456'))
  return (md5('b3ca02c369a385486e40_' + visitor + pwd) === 'f383767a66314d9453ff2d487afe125a') || tokenRepository[token]
}

function clearExpiredToken() {
  Object.values(tokenRepository).forEach(item => {
    Date.now() - item.time > 1000 * 60 * 60 * 7 && delete tokenRepository[item.id]
  })
}
// towgate
// 0f2c4604bba12ba9db6b
// 0dae30c41b59259c60297101be965038782632dd
function getGithubToken(code) {
  return new Promise(resolve => {
    axios.post('https://github.com/login/oauth/access_token', {
      client_id: 'b3ca02c369a385486e40',
      client_secret: 'cd3239dc7d7d52d84e7388e412bc89ed29c83ad0',
      code
    }, {
      headers: {
        Accept: 'application/json'
      }
    }).then(res => {
      console.log(res.data)
      res.data.access_token && setToken(res.data.access_token)
      resolve(res.data)
    })
  })
}





// github token
// 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



