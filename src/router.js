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
  if (opts.reset) route.stack = [{ name, id }]
  else route.stack.push({ name, id })
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
