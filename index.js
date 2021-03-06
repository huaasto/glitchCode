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
const bodyparser = require('koa-body')

const issue = require('./api/issue')
const pics = require('./api/pics')

var githubToken = ''

const tokenRepository = {
  powerfultoken: { id: 'powerfultoken', time: new Date('3000-1-1').getTime() }
}

const urlWhiteList = [
  '/login'
]

// logger

setInterval(() => {
  axios.get('https://try.compusrecorder.cf/awake').then(res => {
    console.log(res.data)
  }).catch(err => {
    console.log(err)
  })
}, 1000 * 60 * 3)

app.use(async (ctx, next) => {
  // ctx.set("Access-Control-Allow-Origin", 'http://try.compusrecorder.cf')
  await next();
});

// x-response-time

app.use(bodyparser({
  enableTypes: ['json', 'form', 'text'],
  multipart: true
}))

app.use(async (ctx, next) => {
  const url = ctx.req.url
  const token = ctx.req.headers.token
  ctx.set('Access-Control-Allow-Origin', ctx.header.origin); // 很奇怪的是，使用 * 会出现一些其他问题
  ctx.set('Access-Control-Allow-Headers', 'content-type,token,authorization, githubtoken');
  ctx.set('Access-Control-Allow-Methods', 'OPTIONS,GET,HEAD,PUT,POST,DELETE,PATCH')
  console.log(111, ctx.req.headers)
  ctx.req.headers.githubtoken && setToken(ctx.req.headers.githubtoken)
  if (ctx.method == 'OPTIONS') {
    ctx.body = 200;
  } else {
    console.log(555, token)
    console.log(urlWhiteList.includes(url))
    if (urlWhiteList.includes(url) || ctx.req.method !== 'POST') {
      await next();
    } else if (!dealToken({ token })) {
      ctx.response.status = 403
      ctx.body = {
        code: 403,
        message: "fail to identify visitor"
      }
    } else {
      console.log('---------------------------校验通过-----------------------------------')
      await next();
    }
  }

});

router.get('/', async (ctx, next) => {
  // ctx.router available
  ctx.type = 'html'
  ctx.body = await fs.createReadStream('./dist/index.html');
})

router.get('/awake', (ctx) => {
  ctx.body = { status: 1 }
})
// router.get('/main', async (ctx, next) => {
//   // ctx.router available
//   ctx.type = 'html'
//   ctx.body = await fs.createReadStream('./pages/mainpage.html');
// })

router.get('/login', async (ctx, next) => {
  // ctx.router available
  clearExpiredToken()
  if (!ctx.query.code) {
    ctx.redirect("https://github.com/login/oauth/authorize?client_id=b3ca02c369a385486e40&scope=repo")
  } else {
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
  console.log(1, { ...data, token })
  if (dealToken({ ...data, token })) {
    tokenRepository[md5(data.visitor + Date.now())] = { id: md5(data.visitor + Date.now()), time: Date.now() }
    console.log(tokenRepository)
    ctx.body = { code: 0, message: "success", token: md5(data.visitor + Date.now()), githubToken: githubToken };
  } else {
    ctx.response.status = 403
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
router.use('/pics', pics);


app
  .use(router.routes())
  .use(router.allowedMethods())
  .use(serve('dist'));

app.listen(3000);

function dealToken({ visitor, pwd, token }) {
  // v:david p:123456
  console.log('dealToken', 'token:' + token, "visitor:" + md5('b3ca02c369a385486e40_' + visitor + pwd))
  // md5('b3ca02c369a385486e40_david123456') === 'f383767a66314d9453ff2d487afe125a'
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



