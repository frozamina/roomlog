import { reactive } from 'vue'

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '')
  if (!raw) return null
  const [path, qs] = raw.split('?')
  const [name, id] = path.split('/')
  return name ? { name, id: id || null, q: Object.fromEntries(new URLSearchParams(qs || '')) } : null
}

function toHash(r) {
  return '#/' + r.name + (r.id ? '/' + r.id : '')
}

const init = parseHash()

export const route = reactive({ stack: init ? [init] : [{ name: 'home', id: null }] })

export const current = () => route.stack[route.stack.length - 1]

function syncHash() {
  const h = toHash(current())
  if (location.hash !== h) {
    try { history.replaceState(null, '', location.pathname + location.search + h) } catch (e) { }
  }
}

export function go(name, id = null, opts = {}) {
  const r = { name, id }
  if (opts.reset) route.stack = [r]
  // replace：把栈顶换成新页面。新建房源存完要从「编辑」直接变成「详情」，
  // 否则返回键会退回那张已经提交的表单。
  else if (opts.replace) route.stack.splice(route.stack.length - 1, 1, r)
  else route.stack.push(r)
  syncHash()
  scrollTop()
}

export function back() {
  if (route.stack.length > 1) route.stack.pop()
  syncHash()
  scrollTop()
}

export function scrollTop() {
  requestAnimationFrame(() => {
    const el = document.querySelector('.view')
    if (el) el.scrollTop = 0
  })
}
