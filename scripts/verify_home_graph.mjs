import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { mkdir } from "node:fs/promises"
import { once } from "node:events"

// 使用独立浏览器会话，先运行 npm run serve；不访问线上生产站点。
const execute = promisify(execFile)
const base = new URL(process.argv[2] ?? "http://localhost:8083/quartz-site/").href
let session = `home-graph-${process.pid}`
async function browser(...args) {
  const { stdout } = await execute(
    "agent-browser",
    ["--headed", "--session", session, "--json", ...args],
    {
      timeout: 40_000,
      maxBuffer: 4 * 1024 * 1024,
    },
  )
  const result = JSON.parse(stdout)
  assert.ok(result.success, JSON.stringify(result.error))
  return result.data
}
async function evaluate(code) {
  return (await browser("eval", "-b", Buffer.from(code).toString("base64"))).result
}
async function ready() {
  await browser(
    "wait",
    "--fn",
    "document.querySelector('#home-graph .graph-container canvas') !== null",
  )
}
let touchSocket
async function connectTouch(targetId) {
  const { cdpUrl } = await browser("get", "cdp-url")
  const socket = new WebSocket(cdpUrl)
  touchSocket = socket
  await once(socket, "open", { signal: AbortSignal.timeout(10_000) })
  let sequence = 0
  const pending = new Map()
  socket.addEventListener("message", ({ data }) => {
    const response = JSON.parse(data),
      request = pending.get(response.id)
    if (!request) return
    clearTimeout(request.timer)
    pending.delete(response.id)
    if (response.error) request.reject(new Error(JSON.stringify(response.error)))
    else request.resolve(response.result)
  })
  function send(method, params, sessionId) {
    return new Promise((resolve, reject) => {
      const id = ++sequence
      const timer = setTimeout(() => {
        pending.delete(id)
        reject(new Error(`CDP 超时：${method}`))
      }, 10_000)
      pending.set(id, { resolve, reject, timer })
      socket.send(JSON.stringify({ id, method, params, sessionId }))
    })
  }
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true })
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 }, sessionId)
  return (type, touchPoints) => send("Input.dispatchTouchEvent", { type, touchPoints }, sessionId)
}
const selector = "#home-graph .graph-container"
try {
  await browser("set", "viewport", "1440", "1080")
  await browser("open", base)
  await ready()
  for (const [width, height] of [
    [390, 844],
    [320, 760],
    [768, 1024],
    [1440, 1080],
    [844, 390],
  ]) {
    await browser("set", "viewport", String(width), String(height))
    const dimensions =
      await evaluate(`new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => {
      const container = document.querySelector('${selector}'), canvas = container.querySelector('canvas');
      resolve({container: container.clientWidth, canvas: canvas.width / devicePixelRatio, height: container.clientHeight,
        canvasHeight: canvas.height / devicePixelRatio, client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth});
    })))`)
    assert.ok(
      Math.abs(dimensions.container - dimensions.canvas) <= 1,
      `${width}px 图谱须跟随容器宽度：${JSON.stringify(dimensions)}`,
    )
    assert.ok(
      Math.abs(dimensions.height - dimensions.canvasHeight) <= 1,
      `${width}px 图谱须跟随容器高度`,
    )
    assert.ok(dimensions.scroll <= dimensions.client, `${width}px 首页不能横向溢出`)
  }
  console.log("通过：图谱五组视口动态调整，不靠裁切隐藏溢出")
  await browser("set", "viewport", "390", "844")
  const overview =
    await evaluate(`new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => {
    const source=document.querySelector('${selector} canvas'), probe=document.createElement('canvas');
    probe.width=source.width;probe.height=source.height;
    const context=probe.getContext('2d');context.drawImage(source,0,0);
    const pixels=context.getImageData(0,0,probe.width,probe.height).data;
    let minX=probe.width,minY=probe.height,maxX=0,maxY=0;
    for(let y=0;y<probe.height;y++)for(let x=0;x<probe.width;x++)if(pixels[(y*probe.width+x)*4+3]>0){
      minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
    }
    resolve({minX,minY,maxX,maxY,width:probe.width,height:probe.height});
  })))`)
  assert.ok(
    overview.minX > 8 &&
      overview.minY > 8 &&
      overview.maxX < overview.width - 8 &&
      overview.maxY < overview.height - 8,
    `手机初始视野应完整容纳图谱，而不是裁到节点：${JSON.stringify(overview)}`,
  )
  console.log("通过：手机初始全景不会将边缘节点裁掉")

  await browser("set", "viewport", "1440", "1080")
  const counts = await evaluate(`(async () => {
    const index = await fetchData;
    const label = document.querySelector('${selector} canvas').getAttribute('aria-label');
    return {expected: Object.keys(index).length, label};
  })()`)
  assert.match(
    counts.label ?? "",
    new RegExp(`${counts.expected} 个页面`),
    "首页必须绘制当前环境完整索引",
  )
  await evaluate(
    `document.querySelector('#home-graph').scrollIntoView({block:'center',behavior:'instant'})`,
  )
  const painted = await evaluate(`new Promise(resolve => requestAnimationFrame(() => {
    const source=document.querySelector('${selector} canvas'), probe=document.createElement('canvas');
    probe.width=source.width;probe.height=source.height;
    const context=probe.getContext('2d');context.drawImage(source,0,0);
    const pixels=context.getImageData(0,0,probe.width,probe.height).data;
    let painted=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>0)painted++;
    resolve(painted);
  }))`)
  assert.ok(painted > 100, "画布必须真正绘制节点和连线，不是空白占位")
  console.log(`通过：当前索引 ${counts.expected} 个页面全部入图，真实绘制 ${painted} 个像素`)

  const zoom = await evaluate(`(() => {
    const canvas=document.querySelector('${selector} canvas'), box=canvas.getBoundingClientRect();
    const before=canvas.__zoom.k;
    canvas.dispatchEvent(new WheelEvent('wheel',{deltaY:-200,clientX:box.x+box.width/2,clientY:box.y+box.height/2,bubbles:true,cancelable:true,view:window}));
    return {before,after:canvas.__zoom.k};
  })()`)
  assert.ok(zoom.after > zoom.before, "滚轮必须实际改变缩放比例")
  const retainedZoom = await evaluate(
    `new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(document.querySelector('${selector} canvas').__zoom.k))))`,
  )
  assert.ok(Math.abs(retainedZoom - zoom.after) < 0.001, "用户缩放后不能被自动全景重置")
  await browser("click", "#home-graph .global-graph-icon")
  await browser(
    "wait",
    "--fn",
    "!!document.querySelector('#home-graph .global-graph-outer.active canvas')",
  )
  await browser("press", "Escape")
  assert.equal(
    await evaluate(
      "document.querySelector('#home-graph .global-graph-outer').classList.contains('active')",
    ),
    false,
  )
  console.log("通过：滚轮缩放、放大查看和 Escape 退出")

  // 从真实画面中取一个普通节点；不依赖测试专用的图谱内部接口。
  const point = await evaluate(`new Promise(resolve => requestAnimationFrame(() => {
    const source=document.querySelector('${selector} canvas'), box=source.getBoundingClientRect(), probe=document.createElement('canvas');
    probe.width=source.width;probe.height=source.height;
    const context=probe.getContext('2d');context.drawImage(source,0,0);
    const pixels=context.getImageData(0,0,probe.width,probe.height).data;
    const color=document.createElement('canvas').getContext('2d');color.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--gray');color.fillRect(0,0,1,1);
    const rgb=color.getImageData(0,0,1,1).data;
    for(let y=6;y<probe.height-6;y++)for(let x=6;x<probe.width-6;x++){
      const i=(y*probe.width+x)*4;
      if(pixels[i]===rgb[0]&&pixels[i+1]===rgb[1]&&pixels[i+2]===rgb[2]&&pixels[i+3]===255){
        let solid=true;
        for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
          const j=((y+dy)*probe.width+x+dx)*4;
          if(pixels[j]!==rgb[0]||pixels[j+1]!==rgb[1]||pixels[j+2]!==rgb[2]||pixels[j+3]!==255)solid=false;
        }
        if(!solid)continue;
        const px=box.left+x/devicePixelRatio,py=box.top+y/devicePixelRatio;
        if(py>110&&py<innerHeight-20){resolve({x:px,y:py});return;}
      }
    }
    resolve(null);
  }))`)
  assert.ok(point, "应能在真实画面找到普通笔记节点")
  await browser("mouse", "move", String(Math.round(point.x)), String(Math.round(point.y)))
  const cursor = await evaluate(
    `getComputedStyle(document.querySelector('${selector} canvas')).cursor`,
  )
  assert.equal(cursor, "pointer", `点击前必须真实命中节点：${JSON.stringify(point)}`)
  await browser("mouse", "down")
  await browser("mouse", "up")
  await browser("wait", "--fn", "document.body.dataset.slug !== 'index'")
  assert.equal(
    await evaluate(
      "document.querySelector('#home-graph') === null && JSON.parse(document.querySelector('.graph-container').dataset.cfg).depth === 1",
    ),
    true,
  )
  await browser("back")
  await ready()
  for (let round = 0; round < 2; round++) {
    await evaluate("window.spaNavigate(new URL('./Rust/所有权.html',location.href))")
    await browser("wait", "--fn", "document.body.dataset.slug === 'Rust/所有权'")
    await browser("back")
    await ready()
    assert.equal(
      await evaluate("document.querySelectorAll('#home-graph .graph-container canvas').length"),
      1,
    )
  }
  console.log("通过：真实节点点击进入文章，文章保留局部图谱，SPA 多次往返不重复画布")

  await browser("set", "viewport", "390", "844")
  const target = await evaluate(
    "(() => {const box=document.querySelector('#home-graph .global-graph-icon').getBoundingClientRect();return {width:box.width,height:box.height}})()",
  )
  assert.ok(target.width >= 44 && target.height >= 44, "手机放大按钮至少 44 × 44px")
  await evaluate("document.documentElement.style.fontSize='200%'")
  assert.equal(
    await evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth"),
    true,
  )
  await evaluate("document.documentElement.style.removeProperty('font-size')")
  await mkdir("artifacts/home-graph", { recursive: true })
  await evaluate(
    "document.querySelector('#home-graph').scrollIntoView({block:'center',behavior:'instant'})",
  )
  await browser("screenshot", "artifacts/home-graph/mobile.png")
  await browser("set", "viewport", "1440", "1080")
  await evaluate(
    "document.querySelector('#home-graph').scrollIntoView({block:'center',behavior:'instant'})",
  )
  await browser("screenshot", "artifacts/home-graph/desktop.png")
  console.log("通过：44px 手机按钮、200% 字体放大；桌面和手机截图已保存")
  const errors = await browser("errors")
  assert.deepEqual(errors.errors ?? errors, [], "浏览器不能出现未处理错误")
  await browser("close")

  // 控制当前环境的索引，验证没有任何链接的节点也真正进入图谱。
  session += "-isolated"
  await browser("open", "about:blank")
  const detail = (title, links) => ({ title, links, tags: [], content: "", description: "" })
  await browser(
    "network",
    "route",
    "**/static/contentIndex.json",
    "--body",
    JSON.stringify({
      "Rust/所有权": detail("所有权", ["Rust/切片"]),
      "Rust/切片": detail("切片", []),
      孤立测试笔记: detail("没有任何链接的笔记", []),
    }),
  )
  await browser("open", base)
  await ready()
  const label = await evaluate(
    `document.querySelector('${selector} canvas').getAttribute('aria-label')`,
  )
  assert.match(label ?? "", /3 个页面/)
  assert.match(label ?? "", /1 条关联/)
  console.log("通过：当前索引中的孤立笔记也进入图谱，不只显示首页邻居")
  await browser("close")

  session += "-touch"
  await browser("set", "device", "iPhone 12")
  const { targetId } = await browser("open", "about:blank")
  const touch = await connectTouch(targetId)
  await browser("open", base)
  await ready()
  assert.equal(
    await evaluate("navigator.maxTouchPoints > 0 && matchMedia('(pointer: coarse)').matches"),
    true,
  )
  await evaluate(
    `document.querySelector('${selector}').scrollIntoView({block:'center',behavior:'instant'})`,
  )
  const gesture = await evaluate(`(() => {
    const canvas=document.querySelector('${selector} canvas'), box=canvas.getBoundingClientRect();
    return {x:box.left,y:box.top,k:canvas.__zoom.k};
  })()`)
  await touch("touchStart", [
    { id: 1, x: gesture.x + 50, y: gesture.y + 35 },
    { id: 2, x: gesture.x + 90, y: gesture.y + 35 },
  ])
  await touch("touchMove", [
    { id: 1, x: gesture.x + 30, y: gesture.y + 35 },
    { id: 2, x: gesture.x + 120, y: gesture.y + 35 },
  ])
  await touch("touchEnd", [])
  assert.ok(
    await evaluate(`document.querySelector('${selector} canvas').__zoom.k > ${gesture.k}`),
    "手机双指手势必须真正放大图谱",
  )
  const beforeScroll = await evaluate("scrollY")
  await touch("touchStart", [{ id: 1, x: 8, y: 650 }])
  await touch("touchMove", [{ id: 1, x: 8, y: 400 }])
  await touch("touchMove", [{ id: 1, x: 8, y: 200 }])
  await touch("touchEnd", [])
  assert.ok(await evaluate(`scrollY > ${beforeScroll}`), "图谱外的触摸不能阻断正常页面滚动")
  assert.deepEqual((await browser("errors")).errors, [])
  console.log("通过：独立触屏环境的双指放大与图谱外页面滚动")
} finally {
  touchSocket?.close()
  await browser("close").catch(() => {})
}
