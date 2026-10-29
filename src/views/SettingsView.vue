<script setup>
import { computed, inject, onMounted, ref } from 'vue'
import Icon from '../components/Icon.vue'
import { db, billTotal, money, totalSpent, totalMonths, seed, clearAll, thisMonth, load, save } from '../store'
import { cache, dumpAll, ensure, restoreAll, clearPhotos } from '../photos'

const toast = inject('toast')
const fileInput = ref(null)
const busy = ref(false)

function allPhotoIds() {
  const ids = []
  for (const p of db.properties) for (const ph of (p.photos || [])) if (ph && ph.id) ids.push(ph.id)
  return ids
}

onMounted(() => ensure(allPhotoIds()))

const stats = computed(() => {
  const bills = db.properties.reduce((a, p) => a + (p.bills?.length || 0), 0)
  const raw = localStorage.getItem('juzhi.v1') || ''
  const ids = allPhotoIds()
  // dataURL 是 base64，实际字节数约为字符数的 3/4
  let bytes = 0
  for (const id of ids) {
    const c = cache[id]
    if (!c) continue
    bytes += ((c.full?.length || 0) + (c.thumb?.length || 0)) * 0.75
  }
  return {
    props: db.properties.length,
    bills,
    photos: ids.length,
    photoKB: Math.round(bytes / 1024),
    spent: totalSpent(),
    months: totalMonths(),
    size: (raw.length / 1024).toFixed(1)
  }
})

const photoSize = computed(() => {
  const kb = stats.value.photoKB
  return kb >= 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb + ' KB'
})

// bom 只对 CSV 开：Excel 读中文需要它，但 JSON 前面加 BOM 会让 JSON.parse 直接报错
function download(name, text, type, bom = false) {
  try {
    const blob = new Blob([bom ? '\ufeff' + text : text], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1500)
    return true
  } catch (e) { return false }
}

async function exportJSON() {
  if (busy.value) return
  const ids = allPhotoIds()
  busy.value = true
  let photoData = {}
  if (ids.length) {
    toast(`正在打包 ${ids.length} 张照片…`)
    try { photoData = await dumpAll(ids) } catch (e) { console.warn(e) }
  }
  busy.value = false

  const payload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    properties: db.properties,
    photoData
  }
  const text = JSON.stringify(payload, null, 2)
  const name = `居志备份-${new Date().toISOString().slice(0, 10)}.json`
  const ok = download(name, text, 'application/json')

  // 剪贴板放不下几 MB 的内容，大备份就只给文件，别让用户以为复制成功了
  if (text.length < 600000) {
    try {
      await navigator.clipboard.writeText(text)
      toast(ok ? `已导出（含 ${ids.length} 张照片），并复制到剪贴板` : '已复制到剪贴板')
      return
    } catch (e) { /* 落下去给文件提示 */ }
  }
  toast(ok ? `已导出（含 ${ids.length} 张照片）` : '导出失败')
}

function exportCSV() {
  const head = ['房源', '月份', '房租', '水用量(吨)', '水费', '电用量(度)', '电费', '燃气', '物业', '管理费', '网费', '车位', '其他', '合计']
  const rows = [head.join(',')]
  for (const p of db.properties) {
    for (const b of (p.bills || [])) {
      const other = (b.other || []).reduce((a, o) => a + (Number(o.amount) || 0), 0)
      rows.push([
        `"${(p.name || '').replace(/"/g, '""')}"`, b.month,
        b.rent || 0, b.water?.usage || 0, b.water?.amount || 0,
        b.elec?.usage || 0, b.elec?.amount || 0, b.gas?.amount || 0,
        b.property || 0, b.manageFee || 0, b.net || 0, b.parking || 0,
        other, billTotal(b)
      ].join(','))
    }
  }
  const ok = download(`居志账单-${new Date().toISOString().slice(0, 10)}.csv`, rows.join('\n'), 'text/csv', true)
  toast(ok ? '账已导出 CSV' : '导出失败')
}

function pickImport() {
  fileInput.value?.click()
}

async function onImport(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (!f) return
  if (!confirm('导入会覆盖当前全部房源、账单和照片。建议先导出一次备份，确定继续？')) return

  busy.value = true
  try {
    const data = JSON.parse(await f.text())
    if (!Array.isArray(data.properties)) throw new Error('这不是居志的备份文件')
    db.properties = data.properties
    db.settings = { seeded: true }
    if (data.photoData && typeof data.photoData === 'object') {
      await restoreAll(data.photoData)
    }
    save()
    toast(`已恢复 ${data.properties.length} 套房`)
  } catch (err) {
    console.warn(err)
    toast('导入失败：' + (err?.message || '文件读不出来'))
  } finally {
    busy.value = false
  }
}

async function resetDemo() {
  if (!confirm('会覆盖当前所有数据，确定载入示例？')) return
  clearAll()
  await clearPhotos()
  seed()
  load()
  toast('已载入示例数据')
}

async function wipe() {
  if (!confirm('清空所有房源、账单与照片？这个操作不可恢复，建议先导出备份。')) return
  clearAll()
  await clearPhotos()
  toast('已清空')
}
</script>

<template>
  <div class="view">
    <div class="head">
      <div class="eyebrow">设置与数据</div>
      <div class="head-row"><h1 class="page-title">我的</h1></div>
    </div>

    <div class="ov card">
      <div class="o"><b class="num">{{ stats.props }}</b><span>套房</span></div>
      <div class="o"><b class="num">{{ stats.bills }}</b><span>条账单</span></div>
      <div class="o"><b class="num">{{ stats.months }}</b><span>个月</span></div>
      <div class="o"><b class="num">¥{{ money(stats.spent) }}</b><span>累计支出</span></div>
    </div>

    <div class="section">
      <div class="section-title"><h5>数据</h5>
        <span class="sz num">{{ stats.photos ? stats.photos + ' 张照片 · ' + photoSize : '暂无照片' }}</span>
      </div>
      <div class="card">
        <button class="row" @click="exportJSON" :disabled="busy">
          <div class="ri"><Icon name="download" :size="17" /></div>
          <div class="rt"><b>导出 JSON 备份</b><em>含房源、账单与照片，可用来恢复</em></div>
          <Icon name="chevron" :size="14" class="ch" />
        </button>
        <button class="row" @click="pickImport" :disabled="busy">
          <div class="ri"><Icon name="upload" :size="17" /></div>
          <div class="rt"><b>从备份恢复</b><em>导入之前导出的 JSON，会覆盖现有数据</em></div>
          <Icon name="chevron" :size="14" class="ch" />
        </button>
        <button class="row" @click="exportCSV">
          <div class="ri"><Icon name="receipt" :size="17" /></div>
          <div class="rt"><b>导出账单 CSV</b><em>可直接在 Excel 里打开分析</em></div>
          <Icon name="chevron" :size="14" class="ch" />
        </button>
        <button class="row" @click="resetDemo">
          <div class="ri"><Icon name="sparkle" :size="17" /></div>
          <div class="rt"><b>载入示例数据</b><em>三套房子，用来体验完整流程</em></div>
          <Icon name="chevron" :size="14" class="ch" />
        </button>
        <button class="row danger" @click="wipe">
          <div class="ri"><Icon name="trash" :size="17" /></div>
          <div class="rt"><b>清空全部数据</b><em>不可恢复，请先导出备份</em></div>
          <Icon name="chevron" :size="14" class="ch" />
        </button>
      </div>
      <input ref="fileInput" class="hideinp" type="file" accept="application/json,.json" @change="onImport" />

      <div class="section-title"><h5>关于</h5></div>
      <div class="card about">
        <div class="ab">
          <span>版本</span><b class="num">0.1.0</b>
        </div>
        <div class="ab">
          <span>数据存放</span><b>仅本机，不联网</b>
        </div>
        <div class="ab">
          <span>技术栈</span><b>Vue 3 · Capacitor</b>
        </div>
        <p class="note">
          所有数据只保存在这台手机的本地存储里，App 不会上传任何内容。
          换机或卸载前，请先用上面的「导出 JSON」做一次备份。
        </p>
      </div>
    </div>

    <div class="sign">
      <div class="serif">居志</div>
      <p>把住过的地方，变成下一次的依据。</p>
    </div>
    <div style="height:24px"></div>
  </div>
</template>

<style scoped>
.ov{display:grid;grid-template-columns:repeat(2,1fr);gap:1px;margin:14px 20px 0;border-radius:18px;overflow:hidden;background:var(--line)}
.ov .o{background:var(--card);padding:14px 15px}
.ov .o b{display:block;font-size:20px;font-weight:600;letter-spacing:-.02em}
.ov .o span{display:block;font-size:10px;color:var(--ink-3);margin-top:2px;letter-spacing:.04em}
.ov .o:first-child{grid-column:span 1}

.sz{font-size:10px;color:var(--ink-3)}
.row:disabled{opacity:.45}
.hideinp{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
.row{display:flex;align-items:center;gap:11px;width:100%;padding:13px 14px;border-bottom:1px solid var(--line);text-align:left}
.row:last-child{border-bottom:none}
.ri{width:32px;height:32px;border-radius:10px;background:var(--sand);display:grid;place-items:center;color:var(--pine);flex:0 0 32px}
.rt{flex:1;min-width:0}
.rt b{display:block;font-size:13px;font-weight:600}
.rt em{display:block;font-style:normal;font-size:10.5px;color:var(--ink-3);margin-top:2px}
.ch{color:var(--line-2)}
.row.danger .ri{background:var(--clay-soft);color:var(--clay)}
.row.danger .rt b{color:var(--clay-ink)}

.about{padding:6px 14px 12px}
.ab{display:flex;justify-content:space-between;align-items:baseline;padding:10px 0;border-bottom:1px solid var(--line)}
.ab span{font-size:11px;color:var(--ink-3)}
.ab b{font-size:12px;font-weight:500}
.note{font-size:10.5px;color:var(--ink-3);line-height:1.7;margin-top:11px}

.sign{text-align:center;padding:36px 40px 0}
.sign .serif{font-family:ui-serif,'Noto Serif SC',Georgia,serif;font-size:20px;font-weight:600;letter-spacing:.1em;color:var(--ink-3);opacity:.6}
.sign p{font-size:10.5px;color:var(--ink-3);margin-top:7px;opacity:.75}
</style>
