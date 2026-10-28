<script setup>
import { computed, inject } from 'vue'
import Icon from '../components/Icon.vue'
import { db, billTotal, money, totalSpent, totalMonths, seed, clearAll, thisMonth, load } from '../store'

const toast = inject('toast')

const stats = computed(() => {
  const bills = db.properties.reduce((a, p) => a + (p.bills?.length || 0), 0)
  const raw = localStorage.getItem('juzhi.v1') || ''
  return {
    props: db.properties.length,
    bills,
    spent: totalSpent(),
    months: totalMonths(),
    size: (raw.length / 1024).toFixed(1)
  }
})

function download(name, text, type) {
  try {
    const blob = new Blob(['\ufeff' + text], { type })
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
  const text = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), properties: db.properties }, null, 2)
  const name = `居志备份-${new Date().toISOString().slice(0, 10)}.json`
  const ok = download(name, text, 'application/json')
  try {
    await navigator.clipboard.writeText(text)
    toast(ok ? '已导出，同时复制到剪贴板' : '已复制到剪贴板')
  } catch {
    toast(ok ? '已导出文件' : '导出失败')
  }
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
  const ok = download(`居志账单-${new Date().toISOString().slice(0, 10)}.csv`, rows.join('\n'), 'text/csv')
  toast(ok ? '账已导出 CSV' : '导出失败')
}

function resetDemo() {
  if (!confirm('会覆盖当前所有数据，确定载入示例？')) return
  clearAll()
  seed()
  load()
  toast('已载入示例数据')
}

function wipe() {
  if (!confirm('清空所有房源与账单？这个操作不可恢复，建议先导出备份。')) return
  clearAll()
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
      <div class="section-title"><h5>数据</h5><span class="sz num">{{ stats.size }} KB</span></div>
      <div class="card">
        <button class="row" @click="exportJSON">
          <div class="ri"><Icon name="download" :size="17" /></div>
          <div class="rt"><b>导出 JSON 备份</b><em>含全部房源与账单，可用来恢复</em></div>
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
