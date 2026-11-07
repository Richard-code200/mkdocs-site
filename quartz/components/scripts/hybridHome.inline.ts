// 每次 Quartz SPA 导航后重新绑定；文章页不注册首页菜单或鼠标效果。
document.addEventListener("nav", () => {
  const nav = document.querySelector<HTMLElement>(".home-nav")
  const button = nav?.querySelector<HTMLButtonElement>(".home-menu-toggle")
  const links = nav?.querySelector<HTMLElement>(".home-nav-links")
  if (!nav || !button || !links) return

  function followLegacyHash() {
    let id: string
    try {
      id = decodeURIComponent(location.hash.slice(1))
    } catch {
      return false
    }
    const destination = document.getElementById(id)?.dataset.legacyHomeDestination
    if (!destination) return false
    // 原首页正文仍在关于本站页，保留查询参数和旧标题锚点。
    window.spaNavigate(new URL(destination + location.search + location.hash, location.href))
    return true
  }
  if (followLegacyHash()) return

  function updateNavHeight() {
    nav!.style.setProperty("--home-nav-height", `${nav!.getBoundingClientRect().height}px`)
  }
  function setOpen(open: boolean) {
    if (open) updateNavHeight()
    nav!.dataset.open = String(open)
    button!.setAttribute("aria-expanded", String(open))
    button!.setAttribute("aria-label", open ? "关闭导航" : "打开导航")
  }
  function toggle() {
    setOpen(button!.getAttribute("aria-expanded") !== "true")
  }
  function onKey(event: KeyboardEvent) {
    if (
      event.key === "Escape" &&
      button!.getAttribute("aria-expanded") === "true" &&
      !nav!.querySelector(".search-container.active")
    ) {
      // 优先关闭当前菜单，避免未打开的 Quartz 搜索在冒泡阶段抢走焦点。
      event.preventDefault()
      event.stopImmediatePropagation()
      setOpen(false)
      button!.focus()
    }
  }
  function onOutside(event: MouseEvent) {
    const target = event.target
    if (
      target instanceof Node &&
      (!nav!.contains(target) || (target instanceof Element && target.closest(".search-button")))
    )
      setOpen(false)
  }
  function onLink(event: MouseEvent) {
    if (event.target instanceof Element && event.target.closest("a")) setOpen(false)
  }
  const desktop = window.matchMedia("(min-width: 768px)")
  function onResize() {
    if (desktop.matches) setOpen(false)
  }
  const observer = new ResizeObserver(updateNavHeight)
  observer.observe(nav)

  // 只为能悬浮的精细指针分配更新；设置变化时立即清掉待处理帧与光晕。
  const effects = window.matchMedia(
    "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
  )
  const resets: (() => void)[] = []
  const removers: (() => void)[] = []
  for (const area of document.querySelectorAll<HTMLElement>(".preview-home [data-home-glow]")) {
    let frame = 0
    let x = 0
    let y = 0
    function reset() {
      if (frame) cancelAnimationFrame(frame)
      frame = 0
      delete area.dataset.glowActive
      area.style.removeProperty("--glow-x")
      area.style.removeProperty("--glow-y")
    }
    function move(event: PointerEvent) {
      if (!effects.matches || event.pointerType === "touch") return
      x = event.clientX
      y = event.clientY
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const box = area.getBoundingClientRect()
        area.style.setProperty("--glow-x", `${x - box.left}px`)
        area.style.setProperty("--glow-y", `${y - box.top}px`)
        area.dataset.glowActive = "true"
      })
    }
    area.addEventListener("pointermove", move)
    area.addEventListener("pointerleave", reset)
    area.addEventListener("pointercancel", reset)
    resets.push(reset)
    removers.push(() => {
      reset()
      area.removeEventListener("pointermove", move)
      area.removeEventListener("pointerleave", reset)
      area.removeEventListener("pointercancel", reset)
    })
  }
  function resetEffects() {
    for (const reset of resets) reset()
  }

  setOpen(false)
  button.addEventListener("click", toggle)
  links.addEventListener("click", onLink)
  document.addEventListener("keydown", onKey, true)
  document.addEventListener("click", onOutside)
  desktop.addEventListener("change", onResize)
  effects.addEventListener("change", resetEffects)
  window.addEventListener("hashchange", followLegacyHash)
  window.addCleanup(() => {
    button.removeEventListener("click", toggle)
    links.removeEventListener("click", onLink)
    document.removeEventListener("keydown", onKey, true)
    document.removeEventListener("click", onOutside)
    desktop.removeEventListener("change", onResize)
    effects.removeEventListener("change", resetEffects)
    window.removeEventListener("hashchange", followLegacyHash)
    observer.disconnect()
    for (const remove of removers) remove()
  })
})
