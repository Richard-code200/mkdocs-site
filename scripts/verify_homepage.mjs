import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { once } from "node:events"

// 需先启动 npm run serve，并安装 agent-browser；不修改用户的浏览器会话。
// 有头模式提供真实桌面指针能力；Linux 无显示器时由 agent-browser 管理虚拟显示。
const execute = promisify(execFile)
let session = `homepage-regression-${process.pid}`
const base = new URL(process.argv[2] ?? "http://localhost:8082/mkdocs-site/").href
async function browser(...args) {
  const { stdout } = await execute(
    "agent-browser",
    ["--headed", "--session", session, "--json", ...args],
    {
      timeout: 45_000,
      maxBuffer: 4 * 1024 * 1024,
    },
  )
  const response = JSON.parse(stdout)
  assert.ok(response.success, JSON.stringify(response.error))
  return response.data
}
async function evaluate(code) {
  return (await browser("eval", "-b", Buffer.from(code).toString("base64"))).result
}
async function home() {
  const page = await browser("open", base)
  await browser(
    "wait",
    "--fn",
    `document.body.dataset.slug === 'index' && document.querySelector('.home-menu-toggle')?.getAttribute('aria-expanded') === 'false'`,
  )
  return page.targetId
}

let touchSocket
async function enableTouch(targetId) {
  // 当前 CLI 的设备预设只设置尺寸和 UA；用其自身 CDP 连接补齐真实触摸能力。
  const { cdpUrl } = await browser("get", "cdp-url")
  const socket = new WebSocket(cdpUrl)
  touchSocket = socket
  await once(socket, "open", { signal: AbortSignal.timeout(10_000) })
  let sequence = 0
  const pending = new Map()
  socket.addEventListener("message", ({ data }) => {
    const response = JSON.parse(data)
    const request = pending.get(response.id)
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
        reject(new Error(`CDP 请求超时：${method}`))
      }, 10_000)
      pending.set(id, { resolve, reject, timer })
      socket.send(JSON.stringify({ id, method, params, sessionId }))
    })
  }
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true })
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 }, sessionId)
}

try {
  await browser("set", "viewport", "390", "844")
  await home()
  const targets = await evaluate(
    `['.home-menu-toggle', '.home-nav .search-button', ...Array.from({length: 2}, (_,i) => '.preview-actions a:nth-child('+(i+1)+')')].map(selector => {const box=document.querySelector(selector).getBoundingClientRect();return {selector,width:box.width,height:box.height}})`,
  )
  for (const target of targets) {
    assert.ok(
      target.width >= 44 && target.height >= 44,
      `手机触摸目标不足 44 × 44：${JSON.stringify(target)}`,
    )
  }
  await browser("click", ".home-menu-toggle")
  assert.equal(
    await evaluate(`document.querySelector('.home-menu-toggle').getAttribute('aria-expanded')`),
    "true",
  )
  const links = await evaluate(
    `Array.from(document.querySelectorAll('#home-nav-links a')).map(link=>{const box=link.getBoundingClientRect();return {width:box.width,height:box.height,bottom:box.bottom}})`,
  )
  assert.ok(
    links.every((link) => link.width >= 44 && link.height >= 44 && link.bottom <= 844),
    "手机导航项须可见且易于点击",
  )
  await browser("press", "Escape")
  assert.equal(
    await evaluate(
      `document.querySelector('.home-menu-toggle').getAttribute('aria-expanded') === 'false' && document.activeElement.matches('.home-menu-toggle')`,
    ),
    true,
  )
  console.log("通过：390px 手机触摸目标、菜单展开与 Escape 焦点恢复")

  for (const [width, height] of [
    [320, 760],
    [360, 800],
    [390, 844],
    [430, 932],
    [768, 1024],
    [1024, 768],
    [1440, 1080],
    [844, 390],
  ]) {
    await browser("set", "viewport", String(width), String(height))
    const layout = await evaluate(
      `(()=>{const root=document.documentElement;const title=document.querySelector('.preview-wordmark').getBoundingClientRect();return {width:root.clientWidth,scrollWidth:root.scrollWidth,titleLeft:title.left,titleRight:title.right,overflow:getComputedStyle(document.body).overflowX,rootOverflow:getComputedStyle(root).overflowX}})()`,
    )
    assert.ok(
      layout.scrollWidth <= layout.width,
      `${width} × ${height} 横向溢出：${JSON.stringify(layout)}`,
    )
    assert.ok(
      layout.titleLeft >= 0 && layout.titleRight <= layout.width,
      `标题超出 ${width}px 视口`,
    )
    assert.ok(
      !["hidden", "clip"].includes(layout.overflow) &&
        !["hidden", "clip"].includes(layout.rootOverflow),
      "不能用全页裁切隐藏布局错误",
    )
  }
  await browser("set", "viewport", "320", "760")
  await evaluate(`document.documentElement.style.fontSize='200%'`)
  assert.equal(
    await evaluate(`document.documentElement.scrollWidth <= document.documentElement.clientWidth`),
    true,
    "200% 字体放大不能撑宽页面",
  )
  await evaluate(`document.documentElement.style.removeProperty('font-size')`)
  console.log("通过：八组视口、横屏与 200% 字体放大")
  await browser("set", "viewport", "390", "844")
  for (const section of [".preview-hero", ".preview-grid"]) {
    await evaluate(
      `document.querySelector(${JSON.stringify(section)}).scrollIntoView({block:'center',behavior:'instant'})`,
    )
    const accessibility = await browser("a11y", "--tags", "wcag2a,wcag2aa")
    assert.equal(
      accessibility.counts.violations,
      0,
      `首页可访问性检查发现违规：${JSON.stringify(accessibility.violations)}`,
    )
    console.log(
      `通过：${section} 可访问性自动检查；${accessibility.counts.incomplete} 类背景／伪元素结果仍需人工判断`,
    )
  }

  await browser("set", "viewport", "390", "300")
  await browser("click", ".home-menu-toggle")
  await browser("click", ".home-nav .search-button")
  assert.equal(
    await evaluate(`document.querySelector('.home-menu-toggle').getAttribute('aria-expanded')`),
    "false",
    "打开搜索应关闭手机菜单",
  )
  await browser("fill", ".home-nav .search-bar", "所有权")
  await browser(
    "wait",
    "--fn",
    `document.querySelector('.results-container .result-card') !== null`,
  )
  const search = await evaluate(
    `(()=>{const results=document.querySelector('.results-container'),box=results.getBoundingClientRect();return {top:box.top,bottom:box.bottom,height:box.height,scroll:results.scrollHeight,client:results.clientHeight,cardHeight:results.querySelector('.result-card').getBoundingClientRect().height,overflow:getComputedStyle(results).overflowY,wide:document.documentElement.scrollWidth>document.documentElement.clientWidth}})()`,
  )
  assert.ok(
    search.top >= 0 && search.bottom <= 300 && search.height > 0,
    `矮视口搜索结果必须留在可视区域：${JSON.stringify(search)}`,
  )
  assert.ok(
    search.scroll > search.client && ["auto", "scroll"].includes(search.overflow),
    "较多搜索结果应独立滚动",
  )
  assert.equal(search.wide, false, "打开搜索也不能撑宽页面")
  assert.ok(
    search.cardHeight <= search.client,
    `手机搜索摘要不能独占多屏：${JSON.stringify(search)}`,
  )
  await evaluate(
    `window.__homepageNavCount=0;document.addEventListener('nav',()=>window.__homepageNavCount++)`,
  )
  const ownership = await evaluate(
    `Array.from(document.querySelectorAll('.results-container .result-card')).findIndex(link=>link.querySelector('.card-title')?.textContent === '所有权')`,
  )
  assert.ok(ownership >= 0, "中文搜索应找到所有权文章")
  await browser("click", `.results-container .result-card:nth-child(${ownership + 1})`)
  await browser("wait", "--fn", `document.body.dataset.slug === 'Rust/所有权'`)
  assert.equal(
    await evaluate(
      `document.querySelector('.home-nav') === null && document.querySelector('.preview-home') === null && !!document.querySelector('article') && getComputedStyle(document.body).backgroundColor === 'rgb(40, 40, 40)' && window.__homepageNavCount > 0`,
    ),
    true,
    "SPA 打开的文章必须恢复原生布局和背景",
  )
  await browser("back")
  await browser(
    "wait",
    "--fn",
    `document.body.dataset.slug === 'index' && document.querySelector('.home-nav')?.dataset.open === 'false'`,
  )
  assert.ok(
    await evaluate(`window.__homepageNavCount >= 2`),
    "往返应使用 Quartz SPA，不丢失页面内状态",
  )
  for (let round = 0; round < 2; round++) {
    await evaluate(
      `document.querySelector('.preview-card').scrollIntoView({block:'center',behavior:'instant'})`,
    )
    await browser("click", ".preview-card:first-child")
    await browser("wait", "--fn", `document.body.dataset.slug !== 'index'`)
    await browser("back")
    await browser(
      "wait",
      "--fn",
      `document.body.dataset.slug === 'index' && document.querySelector('.home-nav')?.dataset.open === 'false'`,
    )
    await browser("click", ".home-menu-toggle")
    assert.equal(
      await evaluate(`document.querySelector('.home-menu-toggle').getAttribute('aria-expanded')`),
      "true",
      "多次往返后一次点击只能展开一次",
    )
    await browser("press", "Escape")
  }
  await browser("click", ".home-menu-toggle")
  assert.equal(
    await evaluate(`document.querySelector('.home-menu-toggle').getAttribute('aria-expanded')`),
    "true",
  )
  await browser("set", "viewport", "844", "390")
  await browser(
    "wait",
    "--fn",
    `document.querySelector('.home-menu-toggle').getAttribute('aria-expanded') === 'false'`,
  )
  await home()
  console.log("通过：矮视口中文搜索、文章隔离、SPA 多次往返与菜单清理")

  await browser("set", "viewport", "1440", "1080")
  await browser("hover", ".home-nav")
  await evaluate(
    `document.querySelector('.preview-hero').dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerType:'touch',clientX:100,clientY:100}))`,
  )
  assert.equal(
    await evaluate(
      `new Promise(resolve=>requestAnimationFrame(()=>resolve(document.querySelector('[data-glow-active="true"]') === null)))`,
    ),
    true,
    "精细指针环境中的触摸事件也不能启动照明",
  )
  const frames = await evaluate(
    `new Promise(resolve=>{const original=window.requestAnimationFrame;let count=0;window.requestAnimationFrame=callback=>{count++;return original(callback)};try{const hero=document.querySelector('.preview-hero');for(let i=0;i<100;i++)hero.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerType:'mouse',clientX:100+i,clientY:200}));}finally{window.requestAnimationFrame=original}original(()=>resolve(count))})`,
  )
  assert.equal(frames, 1, "同一帧的 100 次移动只能安排一次光晕更新")
  await browser("hover", ".preview-hero")
  assert.equal(
    await evaluate(
      `new Promise(resolve=>requestAnimationFrame(()=>resolve(document.querySelector('.preview-hero').dataset.glowActive)))`,
    ),
    "true",
    "桌面鼠标移动应激活局部照明",
  )
  await browser("hover", ".home-nav")
  assert.equal(
    await evaluate(`document.querySelector('[data-glow-active="true"]') === null`),
    true,
    "离开区域后照明应关闭",
  )
  await evaluate(
    `document.querySelector('.preview-card').scrollIntoView({block:'center',behavior:'instant'})`,
  )
  await browser("hover", ".preview-card:first-child")
  assert.equal(
    await evaluate(
      `new Promise(resolve=>requestAnimationFrame(()=>resolve(document.querySelector('.preview-card').dataset.glowActive)))`,
    ),
    "true",
  )
  await browser("set", "media", "dark", "reduced-motion")
  await browser(
    "wait",
    "--fn",
    `matchMedia('(prefers-reduced-motion: reduce)').matches && document.querySelector('[data-glow-active="true"]') === null`,
  )
  assert.equal(
    await evaluate(
      `new Promise(resolve=>requestAnimationFrame(()=>resolve(matchMedia('(prefers-reduced-motion: reduce)').matches && document.querySelector('[data-glow-active="true"]') === null)))`,
    ),
    true,
    "动态要求减少动效时应清空照明状态",
  )
  await evaluate(
    `document.querySelector('.preview-wordmark').scrollIntoView({block:'center',behavior:'instant'})`,
  )
  await browser("hover", ".preview-wordmark")
  assert.equal(
    await evaluate(`getComputedStyle(document.querySelector('.preview-wordmark-echo')).transform`),
    "none",
    "减少动态效果时重影不能位移",
  )
  console.log("通过：桌面跟随、离开清理与动态减少动效")

  await browser("close")
  session += "-touch"
  await browser("set", "device", "iPhone 12")
  const touchTarget = await home()
  await enableTouch(touchTarget)
  assert.equal(
    await evaluate(
      `matchMedia('(pointer: coarse)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches`,
    ),
    true,
    "触屏检查须独立于减少动效设置",
  )
  await evaluate(
    `document.querySelector('.preview-hero').dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerType:'touch',clientX:100,clientY:100}))`,
  )
  assert.equal(
    await evaluate(
      `new Promise(resolve=>requestAnimationFrame(()=>resolve(document.querySelector('[data-glow-active="true"]') === null)))`,
    ),
    true,
    "触屏不能启动鼠标跟随效果",
  )
  console.log("通过：独立触屏环境的静态退化")

  await browser("open", base + "?compat=hash#%E0%A4%A")
  await browser("click", ".home-menu-toggle")
  assert.equal(
    await evaluate(`document.querySelector('.home-menu-toggle').getAttribute('aria-expanded')`),
    "true",
    "损坏的 hash 不能阻断首页菜单初始化",
  )
  await browser("press", "Escape")
  assert.deepEqual((await browser("errors")).errors, [], "页面不能出现未捕获异常")
  console.log("通过：损坏的百分号锚点不会阻断首页交互")

  await browser("open", base + "?compat=legacy#" + encodeURIComponent("一点想法"))
  await browser("wait", "--fn", `document.body.dataset.slug === '关于本站'`)
  assert.equal(
    await evaluate(
      `location.search === '?compat=legacy' && decodeURIComponent(location.hash) === '#一点想法' && !!document.getElementById('一点想法')`,
    ),
    true,
    "旧首页标题须保留查询参数并到达原文锚点",
  )
  await browser("open", base + "Rust/" + encodeURIComponent("所有权") + "/?compat=route")
  await browser("wait", "--fn", `document.body.dataset.slug === 'Rust/所有权'`)
  assert.equal(
    await evaluate(
      `decodeURIComponent(location.pathname).endsWith('/Rust/所有权.html') && location.search === '?compat=route'`,
    ),
    true,
    "旧目录网址须兼容到规范文章网址",
  )
  assert.deepEqual((await browser("errors")).errors, [], "回归全程不能出现页面未捕获异常")
  console.log("通过：中文旧首页锚点、查询参数及旧目录网址")
} finally {
  touchSocket?.close()
  await browser("close").catch((error) => console.error("关闭测试浏览器失败：", error.message))
}
