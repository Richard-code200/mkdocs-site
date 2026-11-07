import http from "node:http"
import path from "node:path"
import fs from "node:fs"
import handler from "serve-handler"

// 不把 .html 再重定向成无扩展名路径，避免与旧目录网址形成循环。
const port = Number(process.env.PORT ?? 8082)
const base = (process.env.SITE_BASE_PATH ?? "/quartz-site").replace(/\/$/, "")
const directory = path.resolve(".preview")
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT 必须是有效端口")
const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://localhost:${port}`)
  if (url.pathname === "/" && base) {
    response.writeHead(302, { Location: `${base}/` }).end()
    return
  }
  if (base && !url.pathname.startsWith(`${base}/`)) {
    response.writeHead(404).end("网址不属于本站预览路径")
    return
  }
  let pathname = url.pathname.slice(base.length) || "/"
  const local = path.resolve(directory, `.${decodeURIComponent(pathname)}`)
  if (!local.startsWith(directory + path.sep) && local !== directory) {
    response.writeHead(403).end()
    return
  }
  if (pathname.endsWith("/") && fs.existsSync(path.join(local, "index.html"))) pathname += "index.html"
  else if (!pathname.endsWith("/") && fs.existsSync(local + ".html")) pathname += ".html"
  request.url = pathname + url.search
  const setHeader = response.setHeader.bind(response)
  response.setHeader = (name, value) => {
    if (name.toLowerCase() === "location" && typeof value === "string" && value.startsWith("/") && !value.startsWith(`${base}/`)) value = base + value
    return setHeader(name, value)
  }
  return handler(request, response, {
    public: directory,
    cleanUrls: false,
    directoryListing: false,
    headers: [{ source: "**", headers: [{ key: "Cache-Control", value: "no-store" }] }],
  })
})
server.on("error", (error) => { console.error("预览启动失败：", error.message); process.exitCode = 1 })
server.listen(port, "127.0.0.1", () => console.log(`笔记网站已就绪：http://localhost:${port}${base}/（仅本机）`))
