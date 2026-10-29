import { reactive } from 'vue'

/* ================= 照片存储 =================

   为什么不放在 localStorage：那里的配额只有 5MB 左右，一张手机原图
   就有 3–5MB，塞进去会让 store.js 的 save() 直接抛异常——而且是静默
   失败（catch 里只 warn），等于整个数据都存不进去。所以照片走 IndexedDB，
   localStorage 只留 { id, ts } 这种几十字节的元数据。

   IndexedDB 里每条记录同时存两个尺寸：
     full  长边 1600px，约 200KB，看大图用
     thumb 长边 400px，约 20KB，列表和缩略图用
   两者加起来每张约 220KB，50 张也就 11MB，IndexedDB 毫无压力。 */

const DB_NAME = 'juzhi.photos'
const STORE = 'photos'

/** id -> { thumb, full, w, h }；响应式，组件可以直接绑定 */
export const cache = reactive({})

let dbp = null

function open() {
  if (dbp) return dbp
  dbp = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB 不可用'))
      return
    }
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const d = req.result
      if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbp
}

const wrap = (r) => new Promise((res, rej) => {
  r.onsuccess = () => res(r.result)
  r.onerror = () => rej(r.error)
})

async function put(rec) {
  const d = await open()
  const t = d.transaction(STORE, 'readwrite')
  t.objectStore(STORE).put(rec)
  await new Promise((res, rej) => {
    t.oncomplete = res
    t.onerror = () => rej(t.error)
    t.onabort = () => rej(t.error)
  })
  return rec
}

async function del(id) {
  const d = await open()
  const t = d.transaction(STORE, 'readwrite')
  t.objectStore(STORE).delete(id)
  await new Promise((res, rej) => {
    t.oncomplete = res
    t.onerror = () => rej(t.error)
  })
}

/* ================= 压缩 ================= */

/** 解码成位图。createImageBitmap 能按 EXIF 自动摆正，手机竖拍才不会躺倒 */
async function decode(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch (e) {
      try { return await createImageBitmap(file) } catch (e2) { /* 继续走兜底 */ }
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('无法解码这张图片')) }
    img.src = url
  })
}

/** 画到画布并按质量编码，返回 dataURL */
function render(src, maxEdge, quality) {
  const sw = src.width || src.naturalWidth
  const sh = src.height || src.naturalHeight
  if (!sw || !sh) throw new Error('图片尺寸异常')
  const scale = Math.min(1, maxEdge / Math.max(sw, sh))
  const w = Math.max(1, Math.round(sw * scale))
  const h = Math.max(1, Math.round(sh * scale))

  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const ctx = cv.getContext('2d')
  // 透明 PNG 转 JPEG 时底色会变黑，先铺白
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, w, h)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src, 0, 0, w, h)
  return { url: cv.toDataURL('image/jpeg', quality), w, h }
}

/** 逐步降质、再降尺寸，直到塞进预算（预算是 dataURL 的字符数） */
function encode(src, maxEdge, budget) {
  let edge = maxEdge
  for (let pass = 0; pass < 3; pass++) {
    for (const q of [0.84, 0.72, 0.6, 0.48]) {
      const r = render(src, edge, q)
      if (r.url.length <= budget) return r
    }
    edge = Math.round(edge * 0.78)
  }
  return render(src, Math.round(edge * 0.72), 0.45)
}

const newId = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

/* ================= 对外接口 ================= */

/**
 * 把用户选的文件压好存进 IndexedDB
 * @returns {Promise<Array<{id:string, ts:number}>>} 可直接塞进 property.photos
 */
export async function addPhotos(files) {
  const out = []
  for (const f of files) {
    if (!f || !String(f.type || '').startsWith('image/')) continue
    let bitmap = null
    try {
      bitmap = await decode(f)
      const full = encode(bitmap, 1600, 320000)   // 约 240KB
      const thumb = encode(bitmap, 400, 26000)    // 约 20KB
      const rec = {
        id: newId(),
        ts: Date.now(),
        w: full.w,
        h: full.h,
        full: full.url,
        thumb: thumb.url
      }
      await put(rec)
      cache[rec.id] = { thumb: rec.thumb, full: rec.full, w: rec.w, h: rec.h }
      out.push({ id: rec.id, ts: rec.ts })
    } finally {
      if (bitmap && bitmap.close) bitmap.close()
    }
  }
  return out
}

export async function removePhoto(id) {
  if (!id) return
  delete cache[id]
  try { await del(id) } catch (e) { console.warn('照片删除失败', e) }
}

/** 把 id 列表对应的照片读进 cache（已缓存的跳过） */
export async function ensure(ids = []) {
  const need = [...new Set(ids)].filter(id => id && !cache[id])
  if (!need.length) return
  try {
    const d = await open()
    const store = d.transaction(STORE, 'readonly').objectStore(STORE)
    const got = await Promise.all(need.map(id => wrap(store.get(id))))
    need.forEach((id, i) => {
      const rec = got[i]
      // 记成空对象而不是不管，避免每次渲染都重复查一遍
      cache[id] = rec
        ? { thumb: rec.thumb, full: rec.full, w: rec.w, h: rec.h }
        : {}
    })
  } catch (e) {
    console.warn('照片读取失败', e)
  }
}

export const thumbOf = (id) => (id && cache[id]?.thumb) || ''
export const fullOf = (id) => (id && (cache[id]?.full || cache[id]?.thumb)) || ''

/** 清掉没被任何房源引用的照片。只在启动时调一次，此刻不可能有正在编辑的草稿 */
export async function sweepOrphans(referenced = []) {
  const keep = new Set(referenced)
  try {
    const d = await open()
    const all = await wrap(d.transaction(STORE, 'readonly').objectStore(STORE).getAll())
    const cutoff = Date.now() - 10 * 60 * 1000
    for (const rec of all) {
      if (keep.has(rec.id)) continue
      if (rec.ts && rec.ts > cutoff) continue   // 刚加的，可能是还没保存的草稿
      await del(rec.id)
    }
  } catch (e) {
    console.warn('照片清理失败', e)
  }
}

export async function clearPhotos() {
  for (const k of Object.keys(cache)) delete cache[k]
  try {
    const d = await open()
    const t = d.transaction(STORE, 'readwrite')
    t.objectStore(STORE).clear()
    await new Promise((res) => { t.oncomplete = res; t.onerror = res })
  } catch (e) {
    console.warn('照片清空失败', e)
  }
}

/** 导出用：把所有照片连数据一起取出来 */
export async function dumpAll(ids = []) {
  await ensure(ids)
  const out = {}
  for (const id of ids) {
    const c = cache[id]
    if (c && c.full) out[id] = { full: c.full, thumb: c.thumb || c.full, w: c.w, h: c.h }
  }
  return out
}

/** 导入用：把备份里的照片写回 IndexedDB */
export async function restoreAll(map = {}) {
  for (const [id, rec] of Object.entries(map)) {
    if (!rec || !rec.full) continue
    try {
      await put({ id, ts: Date.now(), w: rec.w || 0, h: rec.h || 0, full: rec.full, thumb: rec.thumb || rec.full })
      cache[id] = { thumb: rec.thumb || rec.full, full: rec.full, w: rec.w || 0, h: rec.h || 0 }
    } catch (e) {
      console.warn('照片恢复失败', id, e)
    }
  }
}
