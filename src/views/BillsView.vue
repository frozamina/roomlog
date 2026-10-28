<script setup>
import { computed, inject, reactive, ref, watch } from 'vue'
import Icon from '../components/Icon.vue'
import { db, billTotal, monthlyAvg, perSqm, money, monthLabel, thisMonth, isLiving, blankProperty, uid } from '../store'

const toast = inject('toast')
const pickerOpen = ref(false)
const sheetOpen = ref(false)

const propId = ref(db.properties.find(isLiving)?.id || db.properties[0]?.id)
const prop = computed(() => db.properties.find(p => p.id === propId.value) || db.properties[0])

const bills = computed(() => [...(prop.value?.bills || [])].sort((a, b) => a.month.localeCompare(b.month)))
const month = ref(bills.value.length ? bills.value[bills.value.length - 1].month : thisMonth())

watch(prop, () => {
  const b = [...(prop.value?.bills || [])].sort((a, x) => a.month.localeCompare(x.month))
  month.value = b.length ? b[b.length - 1].month : thisMonth()
})

const current = computed(() => bills.value.find(b => b.month === month.value))
const prevBill = computed(() => {
  const i = bills.value.findIndex(b => b.month === month.value)
  return i > 0 ? bills.value[i - 1] : null
})

const total = computed(() => current.value ? billTotal(current.value) : 0)
const prevTotal = computed(() => prevBill.value ? billTotal(prevBill.value) : 0)
const delta = computed(() => {
  if (!prevTotal.value) return null
  return ((total.value - prevTotal.value) / prevTotal.value) * 100
})
const daysInMonth = computed(() => {
  const [y, m] = month.value.split('-').map(Number)
  return new Date(y, m, 0).getDate()
})
const perDay = computed(() => total.value ? total.value / daysInMonth.value : 0)
const avg = computed(() => monthlyAvg(prop.value || {}))
const sqm = computed(() => perSqm(prop.value || {}))

const composition = computed(() => {
  const b = current.value
  if (!b) return []
  const n = (x) => Number(x) || 0
  const other = (b.other || []).reduce((a, o) => a + n(o.amount), 0)
  const parts = [
    { k: '房租', v: n(b.rent), c: '#2C4A3B' },
    { k: '电费', v: n(b.elec?.amount), c: '#C9963C' },
    { k: '水费', v: n(b.water?.amount), c: '#5B8DC0' },
    { k: '物业', v: n(b.property), c: '#8C7B62' },
    { k: '网费', v: n(b.net), c: '#BF6A45' },
    { k: '燃气', v: n(b.gas?.amount), c: '#D6CFBD' },
    { k: '其他', v: n(b.manageFee) + n(b.parking) + other, c: '#E7E1D1' }
  ].filter(p => p.v > 0)
  const sum = parts.reduce((a, p) => a + p.v, 0) || 1
  return parts.map(p => ({ ...p, pct: p.v / sum * 100 }))
})

const trend = computed(() => {
  const arr = bills.value.slice(-6)
  const vals = arr.map(b => billTotal(b))
  const max = Math.max(...vals, 1)
  const min = Math.min(...vals, 0)
  const span = Math.max(max - min, 1)
  return arr.map((b, i) => ({
    month: b.month, v: vals[i],
    h: Math.round(16 + 42 * ((vals[i] - min) / span))
  }))
})

const utilRatio = computed(() => {
  const b = current.value
  if (!b) return 0
  const t = billTotal(b)
  return t ? ((Number(b.water?.amount) || 0) + (Number(b.elec?.amount) || 0)) / t * 100 : 0
})

function shiftMonth(dir) {
  const [y, m] = month.value.split('-').map(Number)
  const d = new Date(y, m - 1 + dir, 1)
  month.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/* ---------- 记一笔 ---------- */
const form = reactive({})

function openSheet() {
  const b = current.value || {
    rent: prop.value?.rent || '', water: { usage: '', price: prop.value?.facts?.waterPrice || '', amount: '' },
    elec: { usage: '', price: prop.value?.facts?.elecPrice || '', amount: '' },
    gas: { usage: '', amount: '' }, property: prop.value?.facts?.propertyFee || '',
    manageFee: prop.value?.facts?.manageFee || '', net: prop.value?.facts?.netFee || '',
    parking: prop.value?.facts?.parkingFee || '', other: []
  }
  Object.keys(form).forEach(k => delete form[k])
  Object.assign(form, JSON.parse(JSON.stringify(b)))
  sheetOpen.value = true
}

function onUsage(kind, val) {
  const f = form[kind]
  f.usage = val === '' ? '' : Number(val)
  const price = Number(f.price) || 0
  if (price && f.usage !== '') f.amount = Math.round(f.usage * price * 100) / 100
}
function onAmount(kind, val) {
  const f = form[kind]
  f.amount = val === '' ? '' : Number(val)
}

function addOther() {
  if (!form.other) form.other = []
  form.other.push({ name: '', amount: '' })
}

function saveBill() {
  const p = prop.value
  if (!p) return
  const data = { ...JSON.parse(JSON.stringify(form)), id: current.value?.id || uid(), month: month.value }
  if (!p.bills) p.bills = []
  const i = p.bills.findIndex(b => b.month === month.value)
  if (i >= 0) p.bills[i] = data
  else p.bills.push(data)
  sheetOpen.value = false
  toast('已记账')
}

function deleteBill() {
  const p = prop.value
  p.bills = p.bills.filter(b => b.month !== month.value)
  sheetOpen.value = false
  toast('已删除本月记录')
}
</script>

<template>
  <div class="view">
    <div class="head">
      <div class="eyebrow">费用账本</div>
      <div class="head-row">
        <h1 class="page-title">账单</h1>
      </div>
      <button class="house" @click="pickerOpen = true">
        <span>{{ prop?.name || '未选择房源' }}</span>
        <Icon name="chevron" :size="12" :sw="2.2" />
      </button>
    </div>

    <div class="monthbar">
      <button class="mbtn" @click="shiftMonth(-1)"><Icon name="back" :size="13" :sw="2.2" /></button>
      <b class="num">{{ monthLabel(month) }}</b>
      <button class="mbtn" @click="shiftMonth(1)"><Icon name="chevron" :size="13" :sw="2.2" /></button>
      <div class="spacer"></div>
      <button class="addbtn" @click="openSheet">
        <Icon name="plus" :size="12" :sw="2.6" />{{ current ? '修改' : '记一笔' }}
      </button>
    </div>

    <template v-if="current">
      <div class="total">
        <div class="lbl">本月总支出</div>
        <div class="amt"><i>¥</i><b class="num">{{ money(total) }}</b></div>
        <div class="delta">
          <span class="tag-n num" v-if="delta !== null" :class="{ up: delta > 0 }">
            {{ delta > 0 ? '↑' : '↓' }} {{ Math.abs(delta).toFixed(1) }}%
          </span>
          <span v-if="delta !== null">较上月</span>
          <span class="sub num">日均 ¥{{ perDay.toFixed(0) }} · 每㎡ ¥{{ sqm.toFixed(0) }}</span>
        </div>
      </div>

      <div class="duo">
        <div class="card duo-card">
          <div class="h"><b style="background:#5B8DC0"></b>水费</div>
          <div class="v"><b class="num">{{ current.water?.usage || 0 }}</b><span>吨</span></div>
          <div class="f num">¥{{ money(current.water?.amount) }}<template v-if="current.water?.price"> · 单价 {{ current.water.price }}/吨</template></div>
        </div>
        <div class="card duo-card">
          <div class="h"><b style="background:#C9963C"></b>电费</div>
          <div class="v"><b class="num">{{ current.elec?.usage || 0 }}</b><span>度</span></div>
          <div class="f num">¥{{ money(current.elec?.amount) }}<template v-if="current.elec?.price"> · 单价 {{ current.elec.price }}/度</template></div>
        </div>
      </div>

      <div class="section">
        <div class="section-title" style="padding:18px 0 9px">
          <h5>支出构成</h5>
          <span class="ratio num">水电占 {{ utilRatio.toFixed(0) }}%</span>
        </div>
        <div class="stack">
          <i v-for="c in composition" :key="c.k" :style="{ width: c.pct + '%', background: c.c }"></i>
        </div>
        <div class="legend">
          <div v-for="c in composition" :key="c.k">
            <b :style="{ background: c.c }"></b>{{ c.k }}<em class="num">{{ money(c.v) }}</em>
          </div>
        </div>

        <div class="mini card" v-if="trend.length > 1">
          <div class="mh"><span>近 {{ trend.length }} 个月</span><b class="num">均值 ¥{{ money(avg) }}</b></div>
          <div class="chart">
            <div class="c" v-for="t in trend" :key="t.month" :class="{ on: t.month === month }">
              <i :style="{ height: t.h + 'px' }"></i>
              <span class="num">{{ Number(t.month.slice(5)) }}月</span>
            </div>
          </div>
        </div>

        <div class="listhead"><h5>本月明细</h5></div>
        <div class="bill-row" v-for="c in composition" :key="c.k + 'r'">
          <div class="bico" :style="{ background: c.c + '22', color: c.c }">{{ c.k.slice(0, 1) }}</div>
          <div class="bn">{{ c.k }}</div>
          <div class="ba num">¥{{ money(c.v) }}</div>
        </div>
      </div>
      <div style="height:24px"></div>
    </template>

    <div class="empty" v-else>
      <div class="ico"><Icon name="receipt" :size="28" /></div>
      <h4>{{ monthLabel(month) }}还没有记录</h4>
      <p>录 4 个数字，30 秒。之后就能看到真实的居住成本。</p>
      <button class="btn btn-primary" style="margin-top:22px;width:auto;padding:0 28px" @click="openSheet">记一笔</button>
    </div>

    <!-- 房源选择 -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="pickerOpen" class="sheet-mask" @click="pickerOpen = false"></div>
      </Transition>
      <Transition name="fade">
        <div v-if="pickerOpen" class="sheet">
          <div class="sheet-grip"></div>
          <h3 class="sheet-t">选择房源</h3>
          <button v-for="p in db.properties" :key="p.id" class="pick" :class="{ on: p.id === propId }"
                  @click="propId = p.id; pickerOpen = false">
            <div>
              <div class="pn">{{ p.name }}</div>
              <div class="ps num">{{ isLiving(p) ? '在住' : '已退租' }} · 月均 ¥{{ money(monthlyAvg(p)) }}</div>
            </div>
            <Icon v-if="p.id === propId" name="check" :size="16" />
          </button>
        </div>
      </Transition>
    </Teleport>

    <!-- 记一笔 -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="sheetOpen" class="sheet-mask" @click="sheetOpen = false"></div>
      </Transition>
      <Transition name="fade">
        <div v-if="sheetOpen" class="sheet">
          <div class="sheet-grip"></div>
          <h3 class="sheet-t">{{ monthLabel(month) }} · 记一笔</h3>

          <div class="frow">
            <label>房租</label>
            <input v-model.number="form.rent" type="number" inputmode="numeric" placeholder="1800" class="fin num" />
          </div>

          <div class="group">
            <div class="gh"><b style="background:#5B8DC0"></b>水费</div>
            <div class="g3">
              <div><label>用量（吨）</label><input :value="form.water?.usage" type="number" inputmode="decimal" class="fin num" @input="onUsage('water', $event.target.value)" /></div>
              <div><label>单价</label><input v-model.number="form.water.price" type="number" inputmode="decimal" class="fin num" /></div>
              <div><label>金额</label><input :value="form.water?.amount" type="number" inputmode="decimal" class="fin num" @input="onAmount('water', $event.target.value)" /></div>
            </div>
          </div>

          <div class="group">
            <div class="gh"><b style="background:#C9963C"></b>电费</div>
            <div class="g3">
              <div><label>用量（度）</label><input :value="form.elec?.usage" type="number" inputmode="decimal" class="fin num" @input="onUsage('elec', $event.target.value)" /></div>
              <div><label>单价</label><input v-model.number="form.elec.price" type="number" inputmode="decimal" class="fin num" /></div>
              <div><label>金额</label><input :value="form.elec?.amount" type="number" inputmode="decimal" class="fin num" @input="onAmount('elec', $event.target.value)" /></div>
            </div>
          </div>

          <div class="g2">
            <div class="group">
              <div class="gh"><b style="background:#D6CFBD"></b>燃气</div>
              <div class="g2inner">
                <div><label>用量（方）</label><input v-model.number="form.gas.usage" type="number" inputmode="decimal" class="fin num" /></div>
                <div><label>金额</label><input v-model.number="form.gas.amount" type="number" inputmode="decimal" class="fin num" /></div>
              </div>
            </div>
            <div class="group">
              <div class="gh"><b style="background:#8C7B62"></b>固定费用</div>
              <div class="g2inner">
                <div><label>物业</label><input v-model.number="form.property" type="number" inputmode="numeric" class="fin num" /></div>
                <div><label>网费</label><input v-model.number="form.net" type="number" inputmode="numeric" class="fin num" /></div>
              </div>
            </div>
          </div>

          <div class="g2">
            <div class="group">
              <div class="gh"><b style="background:#BF6A45"></b>管理费</div>
              <div class="g2inner">
                <div><input v-model.number="form.manageFee" type="number" inputmode="numeric" class="fin num" placeholder="0" /></div>
              </div>
            </div>
            <div class="group">
              <div class="gh"><b style="background:#C4BBA6"></b>车位</div>
              <div class="g2inner">
                <div><input v-model.number="form.parking" type="number" inputmode="numeric" class="fin num" placeholder="0" /></div>
              </div>
            </div>
          </div>

          <div class="group">
            <div class="gh" style="justify-content:space-between">
              <span><b style="background:#E7E1D1"></b>其他</span>
              <button class="mini-add" @click="addOther">+ 添加</button>
            </div>
            <div class="oth" v-for="(o, i) in form.other" :key="i">
              <input v-model="o.name" class="fin" placeholder="保洁 / 维修 …" />
              <input v-model.number="o.amount" type="number" inputmode="numeric" class="fin num" placeholder="金额" />
            </div>
          </div>

          <div class="sheet-actions">
            <button class="btn btn-primary" @click="saveBill">保存</button>
            <button v-if="current" class="btn btn-text" style="color:var(--clay)" @click="deleteBill">删除这条记录</button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.house{display:inline-flex;align-items:center;gap:5px;margin-top:9px;font-size:12px;color:var(--pine);background:var(--pine-soft);border:1px solid rgba(44,74,59,.13);padding:5px 11px;border-radius:99px;font-weight:600}
.house svg{opacity:.6}

.monthbar{display:flex;align-items:center;gap:4px;padding:14px 20px 0}
.mbtn{width:26px;height:26px;border-radius:99px;background:var(--sand);display:grid;place-items:center;color:var(--ink-2)}
.monthbar b{font-size:13px;font-weight:600;padding:0 4px;min-width:96px;text-align:center}
.spacer{flex:1}
.addbtn{display:flex;align-items:center;gap:4px;font-size:11.5px;font-weight:600;color:var(--pine);background:var(--pine-soft);border:1px solid rgba(44,74,59,.14);border-radius:99px;padding:6px 11px}

.total{padding:20px 20px 0}
.total .lbl{font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3);font-weight:600}
.amt{display:flex;align-items:baseline;gap:5px;margin-top:6px}
.amt i{font-style:normal;font-size:19px;color:var(--ink-2);font-weight:400}
.amt b{font-size:44px;letter-spacing:-.035em}
.delta{display:flex;align-items:center;gap:8px;margin-top:8px;font-size:10.5px;color:var(--ink-3)}
.tag-n{font-size:10.5px;font-weight:600;padding:2px 7px;border-radius:6px;background:var(--pine-soft);color:var(--pine)}
.tag-n.up{background:var(--clay-soft);color:var(--clay-ink)}
.delta .sub{margin-left:auto}

.duo{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 20px 0}
.duo-card{padding:12px 13px;border-radius:16px}
.duo-card .h{display:flex;align-items:center;gap:6px;font-size:10.5px;color:var(--ink-3)}
.duo-card .h b{width:5px;height:5px;border-radius:99px}
.duo-card .v{display:flex;align-items:baseline;gap:3px;margin-top:6px}
.duo-card .v b{font-size:21px;font-weight:600;letter-spacing:-.02em;line-height:1}
.duo-card .v span{font-size:10.5px;color:var(--ink-3)}
.duo-card .f{font-size:9.5px;color:var(--ink-3);margin-top:5px}

.ratio{font-size:10px;color:var(--ink-3)}
.stack{height:10px;border-radius:99px;overflow:hidden;display:flex;gap:1.5px;background:var(--sand)}
.stack i{display:block;height:100%}
.legend{display:flex;flex-wrap:wrap;gap:8px 14px;margin-top:10px}
.legend div{display:flex;align-items:center;gap:5px;font-size:10px;color:var(--ink-2)}
.legend b{width:6px;height:6px;border-radius:2px;flex:0 0 6px}
.legend em{font-style:normal;color:var(--ink-3);margin-left:2px}

.mini{margin-top:16px;padding:12px 14px 8px;border-radius:16px}
.mh{display:flex;justify-content:space-between;align-items:baseline}
.mh span{font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);font-weight:600}
.mh b{font-size:10px;color:var(--ink-2);font-weight:600}
.chart{display:flex;align-items:flex-end;gap:6px;height:60px;margin-top:9px}
.chart .c{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:4px;height:100%}
.chart .c i{width:100%;flex:none;border-radius:4px 4px 2px 2px;background:var(--sand-2)}
.chart .c.on i{background:var(--pine)}
.chart .c span{font-size:8px;color:var(--ink-3)}

.listhead{margin-top:18px}
.listhead h5{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3);font-weight:600}
.bill-row{display:flex;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid var(--line)}
.bill-row:last-child{border-bottom:none}
.bico{width:28px;height:28px;border-radius:9px;display:grid;place-items:center;font-size:11px;font-weight:600;flex:0 0 28px}
.bn{flex:1;font-size:12.5px}
.ba{font-size:12.5px;font-weight:600}

/* sheet */
.sheet-t{font-family:ui-serif,'Noto Serif SC',Georgia,serif;font-size:18px;font-weight:600;margin-bottom:14px}
.pick{display:flex;align-items:center;justify-content:space-between;width:100%;padding:13px 0;border-bottom:1px solid var(--line);text-align:left;color:var(--ink)}
.pick:last-child{border-bottom:none}
.pick.on{color:var(--pine)}
.pn{font-size:14px;font-weight:600}
.ps{font-size:10.5px;color:var(--ink-3);margin-top:2px}

.frow{display:flex;align-items:center;justify-content:space-between;padding:11px 0;border-bottom:1px solid var(--line)}
.frow label{font-size:12px;color:var(--ink-2)}
.fin{width:100%;height:30px;font-size:15px;font-weight:500;background:var(--sand);border-radius:8px;padding:0 9px;text-align:right}
.fin:focus{background:var(--pine-soft);box-shadow:inset 0 0 0 1.5px var(--pine)}
.fin::placeholder{color:var(--ink-3);font-weight:400}
.group{padding:11px 0;border-bottom:1px solid var(--line)}
.gh{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--ink-3);margin-bottom:7px}
.gh b{width:5px;height:5px;border-radius:99px}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px}
.g3 label,.g2inner label{display:block;font-size:9px;color:var(--ink-3);margin-bottom:3px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.g2inner{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.mini-add{font-size:10.5px;color:var(--pine);font-weight:600}
.oth{display:grid;grid-template-columns:1fr 90px;gap:7px;margin-bottom:6px}
.sheet-actions{margin-top:16px;display:flex;flex-direction:column;gap:2px}
</style>
