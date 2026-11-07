// 每次 Quartz SPA 导航后重新绑定，只在首页注册菜单事件。
document.addEventListener("nav", () => {
  const nav = document.querySelector<HTMLElement>(".home-nav")
  const button = nav?.querySelector<HTMLButtonElement>(".home-menu-toggle")
  const links = nav?.querySelector<HTMLElement>(".home-nav-links")
  if (!nav || !button || !links) return

  function followLegacyHash() {
    const anchor = document.getElementById(decodeURIComponent(location.hash.slice(1)))
    const destination = anchor?.dataset.legacyHomeDestination
    if (!destination) return false
    // 原首页正文保存在关于本站页，旧的首页标题链接也继续指向原文。
    window.spaNavigate(new URL(destination + location.search + location.hash, location.href))
    return true
  }
  if (followLegacyHash()) return

  function setOpen(open: boolean) {
    nav!.dataset.open = String(open)
    button!.setAttribute("aria-expanded", String(open))
    button!.setAttribute("aria-label", open ? "关闭导航" : "打开导航")
  }
  function toggle() {
    setOpen(button!.getAttribute("aria-expanded") !== "true")
  }
  function onKey(event: KeyboardEvent) {
    if (event.key === "Escape" && button!.getAttribute("aria-expanded") === "true") {
      setOpen(false)
      button!.focus()
    }
  }
  function onOutside(event: MouseEvent) {
    if (!nav!.contains(event.target as Node)) setOpen(false)
  }
  function onLink(event: MouseEvent) {
    if ((event.target as Element).closest("a")) setOpen(false)
  }
  const desktop = window.matchMedia("(min-width: 768px)")
  function onResize() { if (desktop.matches) setOpen(false) }

  setOpen(false)
  button.addEventListener("click", toggle)
  links.addEventListener("click", onLink)
  document.addEventListener("keydown", onKey)
  document.addEventListener("click", onOutside)
  desktop.addEventListener("change", onResize)
  window.addEventListener("hashchange", followLegacyHash)
  window.addCleanup(() => {
    button.removeEventListener("click", toggle)
    links.removeEventListener("click", onLink)
    document.removeEventListener("keydown", onKey)
    document.removeEventListener("click", onOutside)
    desktop.removeEventListener("change", onResize)
    window.removeEventListener("hashchange", followLegacyHash)
  })
})
