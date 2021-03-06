function queryPostData(ctx) {
  try {
    return JSON.parse(ctx.request.body)
  } catch {
    return ctx.request.body
  }
  // 没办法获取表单
  return new Promise((res) => {
    var postData = "";
    // 数据块接收中
    ctx.req.addListener("data", (chunk) => {
      postData += chunk;
    });
    // 数据接收完毕，执行回调函数
    ctx.req.addListener("end", () => {
      res(postData && JSON.parse(postData))
    });
  })
}


module.exports = {
  queryPostData
}