<script setup>
import { computed, ref } from 'vue'
import Icon from '../components/Icon.vue'
import { go, back } from '../router'
import { db, DIMENSIONS, dimScore, livability, monthlyAvg, perSqm, billTotal, money, preferenceProfile, isLiving } from '../store'

const rows = computed(() => preferenceProfile())
const list = computed(() => db.properties)

const aId = ref(list.value[0]?.id)
const bId = ref(list.value[1]?.id || list.value[0]?.id)
const picking = ref(null)

const A = computed(() => list.value.find(p => p.id === aId.value))
const B = computed(() => list.value.find(p => p.id === bId.value))

function matchScore(p) {
  if (!p) return 0
  let sw = 0, sv = 0
  for (const r of rows.value) {
    const d = DIMENSIONS.find(x => x.key === r.key)
    const s = dimScore(p, d)
    if (!s) continue
    sw += r.pct; sv += s * r.pct
  }
  return sw ? Math.round(sv / (sw * 5) * 100) : 0
}

const metrics = computed(() => {
  const a = A.value, b = B.value
  if (!a || !b) return []
  const num = (x) => (x === '' || x === null || x === undefined) ? null : Number(x)
  const util = (p) => {
    const bills = p.bills || []
    if (!bills.length) return null
    const t = bills.reduce((s, x) => s + billTotal(x), 0)
    const u = bills.reduce((s, x) => s + (Number(x.water?.amount) || 0) + (Number(x.elec?.amount) || 0), 0)
    return t ? u / t * 100 : null
  }
  const raw = [
    { k: '居所指数', ra: livability(a) || null, rb: livability(b) || null, better: 'high', f: v => v },
    { k: '匹配度', ra: matchScore(a), rb: matchScore(b), better: 'high', f: v => v + '%' },
    { k: '每㎡成本', ra: perSqm(a) || null, rb: perSqm(b) || null, better: 'low', f: v => '¥' + v.toFixed(0) },
    { k: '实测月均', ra: monthlyAvg(a), rb: monthlyAvg(b), better: 'low', f: v => '¥' + money(v) },
    { k: '水电占比', ra: util(a), rb: util(b), better: 'low', f: v => v.toFixed(0) + '%' },
    ...DIMENSIONS.map(d => ({
      k: d.label,
      ra: dimScore(a, d) || null, rb: dimScore(b, d) || null,
      better: 'high', f: v => v.toFixed(1)
    })),
    { k: '通勤', ra: num(a.facts?.commute), rb: num(b.facts?.commute), better: 'low', f: v => v + ' 分' },
    { k: '上下楼', ra: a.facts?.elevator || null, rb: b.facts?.elevator || null, better: 'none' },
    { k: '水电性质', ra: a.facts?.utilityType || null, rb: b.facts?.utilityType || null, better: 'none' }
  ]
  const shown = (v, f) => {
    if (v === null || v === undefined || v === '') return '—'
    return f && typeof v === 'number' ? f(v) : String(v)
  }
  return raw.map(m => {
    let wa = false, wb = false
    if (m.better !== 'none' && typeof m.ra === 'number' && typeof m.rb === 'number' && m.ra !== m.rb) {
      if (m.better === 'high') { wa = m.ra > m.rb; wb = m.rb > m.ra }
      else { wa = m.ra < m.rb; wb = m.rb < m.ra }
    }
    return { k: m.k, a: shown(m.ra, m.f), b: shown(m.rb, m.f), wa, wb }
  })
})

function pick(id) {
  if (picking.value === 'a') aId.value = id
  else bId.value = id
  picking.value = null
}

const verdict = computed(() => {
  const a = A.value, b = B.value
  if (!a || !b) return null
  const ma = matchScore(a), mb = matchScore(b)
  const win = ma >= mb ? a : b
  const lose = ma >= mb ? b : a
  const diff = Math.abs(monthlyAvg(a) - monthlyAvg(b))
  const cheap = monthlyAvg(a) < monthlyAvg(b) ? a : b
  return { win, lose, ma, mb, diff, cheap }
})
</script>

<template>
  <div class="view">
    <div class="nav solid">
      <button class="nav-btn" @click="back()" aria-label="返回"><Icon name="back" :size="16" /></button>
      <div class="nav-title">房源对比</div>
      <div class="nav-spacer"></div>
    </div>

    <div class="head">
      <div class="eyebrow">候选对比</div>
      <div class="head-row"><h1 class="page-title">看哪一套？</h1></div>
    </div>

    <div class="pickers">
      <button class="picker" @click="picking = 'a'">
        <span class="tagx">A</span>
        <b>{{ A?.name || '选择房源' }}</b>
        <em class="num">¥{{ money(A?.rent) }} / 月</em>
      </button>
      <div class="vs">vs</div>
      <button class="picker" @click="picking = 'b'">
        <span class="tagx">B</span>
        <b>{{ B?.name || '选择房源' }}</b>
        <em class="num">¥{{ money(B?.rent) }} / 月</em>
      </button>
    </div>

    <div class="rows">
      <div class="crow" v-for="m in metrics" :key="m.k">
        <div class="v" :class="{ good: m.wa }">{{ m.a }}</div>
        <div class="k">{{ m.k }}</div>
        <div class="v" :class="{ good: m.wb }">{{ m.b }}</div>
      </div>
    </div>

    <div class="note" v-if="verdict">
      <p>
        <b>{{ verdict.win.name }}</b> 与你的偏好匹配度 <b>{{ Math.max(verdict.ma, verdict.mb) }}%</b>，
        另一套是 {{ Math.min(verdict.ma, verdict.mb) }}%。
        <template v-if="verdict.cheap.id !== verdict.win.id">
          <br>{{ verdict.cheap.name }} 每月便宜 ¥{{ money(verdict.diff) }}，但在你更在意的项上没赢。
        </template>
      </p>
    </div>

    <div class="section" style="margin-top:14px">
      <button class="btn btn-ghost" @click="go('insights')">看我的偏好权重</button>
    </div>
    <div style="height:24px"></div>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="picking" class="sheet-mask" @click="picking = null"></div>
      </Transition>
      <Transition name="fade">
        <div v-if="picking" class="sheet">
          <div class="sheet-grip"></div>
          <h3 class="sheet-t">选择房源 {{ picking.toUpperCase() }}</h3>
          <button v-for="p in list" :key="p.id" class="pick" @click="pick(p.id)">
            <div>
              <div class="pn">{{ p.name }}</div>
              <div class="ps num">{{ isLiving(p) ? '在住' : '已退租' }} · 居所指数 {{ livability(p) || '—' }}</div>
            </div>
            <Icon name="chevron" :size="14" :sw="2" />
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.pickers{display:grid;grid-template-columns:1fr 34px 1fr;gap:6px;align-items:center;padding:16px 20px 14px}
.picker{display:flex;flex-direction:column;align-items:center;gap:3px;padding:12px 8px;border-radius:14px;background:var(--card);border:1px solid var(--line);box-shadow:var(--sh-1)}
.picker b{font-size:12.5px;font-weight:600;text-align:center;line-height:1.35;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.picker em{font-style:normal;font-size:10px;color:var(--ink-3)}
.tagx{font-size:8.5px;letter-spacing:.16em;color:var(--ink-3);font-weight:700}
.vs{font-family:ui-serif,Georgia,serif;font-style:italic;font-size:11px;color:var(--ink-3);text-align:center}

.rows{padding:0 20px}
.crow{display:grid;grid-template-columns:1fr 92px 1fr;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)}
.crow:last-child{border-bottom:none}
.v{font-size:12.5px;font-weight:600;text-align:center;color:var(--ink-2)}
.v.good{color:var(--pine)}
.crow .k{font-size:9.5px;color:var(--ink-3);text-align:center}

.note{margin:16px 20px 0;padding:13px 14px;border-radius:14px;background:var(--pine-soft);border:1px solid rgba(143,74,48,.12)}
.note p{font-size:11.5px;color:var(--pine);line-height:1.7}
.note p b{font-weight:700}

.sheet-t{font-family:ui-serif,'Noto Serif SC',Georgia,serif;font-size:18px;font-weight:600;margin-bottom:12px}
.pick{display:flex;align-items:center;justify-content:space-between;width:100%;padding:13px 0;border-bottom:1px solid var(--line);text-align:left;color:var(--ink)}
.pick:last-child{border-bottom:none}
.pn{font-size:14px;font-weight:600}
.ps{font-size:10.5px;color:var(--ink-3);margin-top:2px}
</style>
