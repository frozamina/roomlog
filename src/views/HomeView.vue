<script setup>
import { computed } from 'vue'
import Icon from '../components/Icon.vue'
import { go } from '../router'
import { db, sortedProperties, isLiving, livability, monthlyAvg, perSqm, monthLabel, monthsBetween, money, totalSpent, totalMonths, thisMonth, billTotal } from '../store'

const list = computed(() => sortedProperties())
const living = computed(() => list.value.find(p => isLiving(p)))
const past = computed(() => list.value.filter(p => !isLiving(p)))
const months = computed(() => totalMonths())
const billCount = computed(() => db.properties.reduce((a, p) => a + (p.bills?.length || 0), 0))
const spent = computed(() => totalSpent())

const recent = computed(() => {
  const byMonth = {}
  for (const p of db.properties) {
    for (const b of (p.bills || [])) byMonth[b.month] = (byMonth[b.month] || 0) + billTotal(b)
  }
  const ms = Object.keys(byMonth).sort().slice(-5)
  const vals = ms.map(m => byMonth[m])
  const max = Math.max(...vals, 1), min = Math.min(...vals, 0)
  const span = Math.max(max - min, 1)
  return ms.map((m, i) => ({ m, v: vals[i], h: Math.round(14 + 30 * ((vals[i] - min) / span)) }))
})
const recentAvg = computed(() => {
  if (!recent.value.length) return 0
  return Math.round(recent.value.reduce((a, r) => a + r.v, 0) / recent.value.length)
})

const pendingBill = computed(() => {
  const p = living.value
  if (!p) return false
  return !(p.bills || []).some(b => b.month === thisMonth())
})

const idx = (p) => { const v = livability(p); return v || '—' }
const period = (p) => {
  const s = (p.startDate || '').slice(0, 7).replace('-', '.')
  const e = (p.endDate || '').slice(0, 7).replace('-', '.')
  return `${s} – ${e || '至今'}`
}
</script>

<template>
  <div class="view">
    <div class="head">
      <div class="eyebrow">居住档案</div>
      <div class="head-row">
        <h1 class="page-title">我的房子</h1>
        <button class="nav-btn" @click="go('edit', 'new')" aria-label="新建房源">
          <Icon name="plus" :size="18" :sw="2.2" />
        </button>
      </div>
      <div class="head-sub num">{{ list.length }} 套房 · {{ months }} 个月记录</div>
    </div>

    <!-- 空状态 -->
    <template v-if="!list.length">
      <div class="empty">
        <div class="ico"><Icon name="home" :size="28" /></div>
        <h4>还没有任何记录</h4>
        <p>从你现在住的这套开始。先填名字和月租，其他随时补。</p>
      </div>
      <div class="section">
        <button class="btn btn-primary" @click="go('edit', 'new')">建立第一套档案</button>
      </div>
    </template>

    <template v-else>
      <!-- 在住 -->
      <div class="living" v-if="living" @click="go('detail', living.id)">
        <div class="pill-live"><b></b>在住</div>
        <h4>{{ living.name }}</h4>
        <div class="addr">{{ living.address || '未填写地址' }}</div>
        <div class="mid">
          <div class="score">
            <b class="num">{{ idx(living) }}</b>
            <span>居所指数</span>
          </div>
          <div class="stayed">已住<br><span class="num">{{ monthsBetween(living.startDate) }} 个月</span></div>
        </div>
        <div class="stats">
          <div><em>月均支出</em><b class="num">¥{{ money(monthlyAvg(living)) }}</b></div>
          <div><em>每㎡成本</em><b class="num">¥{{ perSqm(living).toFixed(0) }}</b></div>
          <div><em>通勤</em><b class="num">{{ living.facts?.commute || '—' }} 分</b></div>
        </div>
      </div>

      <div class="notice" v-if="pendingBill" @click="go('bills')">
        <span class="dot"></span>
        <p>{{ monthLabel(thisMonth()) }}的账单还没记</p>
        <span>去记 ›</span>
      </div>

      <!-- 历史 -->
      <template v-if="past.length">
        <div class="section-title" style="padding-left:20px;padding-right:20px">
          <h5>历史房源</h5>
          <button @click="go('compare')">对比 ›</button>
        </div>
        <div class="section">
          <div class="rec" v-for="p in past" :key="p.id" @click="go('detail', p.id)">
            <div class="main">
              <div class="t">{{ p.name }}</div>
              <div class="m num">{{ period(p) }} · 月均 ¥{{ money(monthlyAvg(p)) }}</div>
              <div class="chips" style="margin-top:7px">
                <span v-for="t in (p.tags || []).slice(0, 3)" :key="t" class="chip-s"
                      :class="{ c: /临街|商电|步梯/.test(t), g: /好|燃气|电梯/.test(t) }">{{ t }}</span>
              </div>
            </div>
            <div class="ring" :style="{ '--v': livability(p) }"><b class="num">{{ idx(p) }}</b></div>
          </div>
        </div>
      </template>

      <div class="recent card" v-if="recent.length" @click="go('bills')">
        <div class="rh">
          <span>最近支出</span>
          <b class="num">月均 ¥{{ money(recentAvg) }}</b>
        </div>
        <div class="rb">
          <div class="rc" v-for="r in recent" :key="r.m">
            <i :style="{ height: r.h + 'px' }"></i>
            <span class="num">{{ r.m.slice(2).replace('-', '.') }}</span>
          </div>
        </div>
      </div>

      <div class="sum">
        <span class="num">{{ billCount }} 条账单 · 累计支出</span>
        <b class="num">¥{{ money(spent) }}</b>
      </div>
    </template>
  </div>
</template>

<style scoped>
.living{
  margin:14px 20px 0;border-radius:22px;padding:18px 18px 16px;color:#FBF7F2;position:relative;overflow:hidden;
  background:radial-gradient(120% 100% at 100% 0%, #A85F3F 0%, #8F4A30 52%, #6B351F 100%);
  box-shadow:0 2px 6px rgba(107,53,31,.14), 0 18px 34px -18px rgba(107,53,31,.5);
  transition:transform .22s var(--ease);
}
.living:active{transform:scale(.985)}
.living::after{content:"";position:absolute;width:180px;height:180px;right:-64px;top:-72px;border-radius:99px;border:1px solid rgba(255,255,255,.12)}
.pill-live{display:inline-flex;align-items:center;gap:5px;font-size:10px;letter-spacing:.08em;padding:3px 9px;border-radius:99px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.16)}
.pill-live b{width:5px;height:5px;border-radius:99px;background:#9AD6A9;box-shadow:0 0 0 2.5px rgba(154,214,169,.22)}
.living h4{font-size:17px;font-weight:600;margin-top:11px;letter-spacing:.01em}
.addr{font-size:11px;color:rgba(244,247,243,.56);margin-top:3px}
.mid{display:flex;align-items:flex-end;justify-content:space-between;margin-top:16px}
.score{display:flex;align-items:baseline;gap:6px}
.score b{font-size:40px;font-weight:600;letter-spacing:-.03em;line-height:1}
.score span{font-size:10.5px;color:rgba(244,247,243,.6);letter-spacing:.06em}
.stayed{font-size:10px;color:rgba(244,247,243,.45);text-align:right;line-height:1.5}
.stayed span{color:rgba(244,247,243,.7)}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;margin-top:16px;background:rgba(255,255,255,.11);border-radius:12px;overflow:hidden}
.stats div{background:rgba(107,53,31,.34);padding:9px 10px}
.stats em{display:block;font-size:9.5px;color:rgba(244,247,243,.55);font-style:normal;letter-spacing:.06em}
.stats b{display:block;font-size:14px;font-weight:600;margin-top:2px}

.notice{margin:14px 20px 0;display:flex;align-items:center;gap:10px;padding:11px 13px;border-radius:14px;background:var(--clay-soft);border:1px solid rgba(191,106,69,.16);color:var(--clay-ink)}
.notice .dot{width:6px;height:6px;border-radius:99px;background:var(--clay);flex:0 0 6px}
.notice p{font-size:11.5px;flex:1;line-height:1.45}
.notice span{font-size:11px;font-weight:600;color:var(--clay)}

.rec{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:13px 14px;display:flex;gap:12px;align-items:center;margin-bottom:10px;box-shadow:var(--sh-1);transition:transform .2s var(--ease)}
.rec:active{transform:scale(.985)}
.rec .main{flex:1;min-width:0}
.rec .t{font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rec .m{font-size:10.5px;color:var(--ink-3);margin-top:3px}
.ring{width:46px;height:46px;border-radius:99px;display:grid;place-items:center;flex:0 0 46px;position:relative}
.ring::before{content:"";position:absolute;inset:0;border-radius:99px;background:conic-gradient(var(--pine) calc(var(--v) * 1%), var(--sand-2) 0)}
.ring::after{content:"";position:absolute;inset:4px;border-radius:99px;background:var(--card)}
.ring b{position:relative;z-index:1;font-size:14px;font-weight:600;color:var(--pine)}

.recent{margin:16px 20px 0;padding:12px 14px 8px;border-radius:16px}
.rh{display:flex;justify-content:space-between;align-items:baseline}
.rh span{font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);font-weight:600}
.rh b{font-size:10.5px;color:var(--ink-2);font-weight:600}
.rb{display:flex;align-items:flex-end;gap:7px;height:54px;margin-top:8px}
.rc{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:4px;height:100%}
.rc i{width:100%;flex:none;border-radius:4px 4px 2px 2px;background:var(--sand-2);transition:height .5s var(--ease)}
.rc:last-child i{background:var(--pine)}
.rc span{font-size:8px;color:var(--ink-3)}
.sum{margin:8px 22px 26px;padding-top:12px;border-top:1px dashed var(--line-2);display:flex;justify-content:space-between;align-items:baseline;font-size:10.5px;color:var(--ink-3)}
.sum b{font-size:12px;font-weight:600;color:var(--ink-2)}
</style>
