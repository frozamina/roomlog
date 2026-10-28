<script setup>
import { computed, ref } from 'vue'
import Icon from '../components/Icon.vue'
import { go } from '../router'
import { db, preferenceProfile, redLines, insightSentence, monthlyAvg, livability, money, totalSpent, totalMonths } from '../store'

const checked = ref([])
const toggleCheck = (k) => {
  const i = checked.value.indexOf(k)
  i >= 0 ? checked.value.splice(i, 1) : checked.value.push(k)
}

const rows = computed(() => preferenceProfile())
const hasData = computed(() => db.properties.some(p => livability(p) > 0))
const reds = computed(() => redLines())
const sentence = computed(() => insightSentence())
const months = computed(() => totalMonths())
const spent = computed(() => totalSpent())

const spentCompare = computed(() => {
  return db.properties
    .map(p => ({ id: p.id, name: p.name, avg: monthlyAvg(p), idx: livability(p) }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 4)
})
const maxAvg = computed(() => Math.max(...spentCompare.value.map(s => s.avg), 1))
</script>

<template>
  <div class="view">
    <div class="head">
      <div class="eyebrow">偏好画像</div>
      <div class="head-row">
        <h1 class="page-title">你真正在意的<br>和你以为的不太一样</h1>
      </div>
      <div class="head-sub num" v-if="hasData">
        基于 {{ db.properties.length }} 套房 · {{ months }} 个月 · {{ rows.reduce((a, r) => a + (r.samples ? 1 : 0), 0) }} 个维度
      </div>
    </div>

    <template v-if="hasData">
      <div class="bars">
        <div class="bar-row" v-for="(r, i) in rows" :key="r.key" :class="{ hot: i === 0 }">
          <span class="k">{{ r.label }}</span>
          <span class="track"><i :style="{ width: r.pct + '%' }"></i></span>
          <span class="p num">{{ r.pct }}</span>
        </div>
      </div>

      <div class="conclusion" v-if="sentence">
        <div class="q">“</div>
        <p v-if="sentence.dim.avg < 4">
          你最在意的是 <b>{{ sentence.dim.label }}</b>，<br>
          实际平均只有 <b>{{ sentence.dim.avg.toFixed(1) }} 分</b>，没达到你的期待。<br>
          下次看房，值得多付 <b>约 {{ sentence.overpaid }} 元/月</b>。
        </p>
        <p v-else>
          你最在意的是 <b>{{ sentence.dim.label }}</b>，<br>
          三套房的平均是 <b>{{ sentence.dim.avg.toFixed(1) }} 分</b>，基本守住了。<br>
          这项可以放心，不用为它加价。
        </p>
        <div class="from">— 来自 {{ sentence.count }} 次打分的交叉计算</div>
      </div>

      <div class="redline" v-if="reds.length">
        <div class="lbl">
          <span>下次看房必查</span>
          <em>{{ reds.length }} 项红线</em>
        </div>
        <div class="chk" v-for="r in reds" :key="r.key" @click="toggleCheck(r.key)">
          <span class="box" :class="{ on: checked.includes(r.key) }">
            <Icon v-if="checked.includes(r.key)" name="check" :size="9" :sw="3.2" />
          </span>
          <p :class="{ done: checked.includes(r.key) }">{{ r.check }}</p>
          <span class="tagd">{{ r.label }} {{ r.avg.toFixed(1) }}</span>
        </div>
      </div>
      <div class="nored" v-else>
        <Icon name="sparkle" :size="15" />
        <span>暂时没有踩线的项目，各项都在 3 分以上。</span>
      </div>

      <div class="section" style="padding-top:20px">
        <div class="section-title" style="padding:0 0 10px">
          <h5>成本对比</h5>
          <button @click="go('compare')">并排对比 ›</button>
        </div>
        <div class="card cmp">
          <div class="crow" v-for="s in spentCompare" :key="s.id" @click="go('detail', s.id)">
            <div class="cn">{{ s.name }}</div>
            <div class="cbar"><i :style="{ width: (s.avg / maxAvg * 100) + '%' }"></i></div>
            <div class="cv num">¥{{ money(s.avg) }}</div>
          </div>
        </div>

        <div class="footnote num">
          累计居住支出 ¥{{ money(spent) }} · {{ months }} 个月
        </div>
      </div>
      <div style="height:24px"></div>
    </template>

    <div class="empty" v-else>
      <div class="ico"><Icon name="chart" :size="28" /></div>
      <h4>还没有足够的数据</h4>
      <p>至少录一套房子的评分，这里才会开始说话。</p>
      <button class="btn btn-primary" style="margin-top:22px;width:auto;padding:0 28px" @click="go('edit', 'new')">去建档案</button>
    </div>
  </div>
</template>

<style scoped>
.bars{margin:20px 20px 0;display:flex;flex-direction:column;gap:13px}
.bar-row{display:flex;align-items:center;gap:10px}
.bar-row .k{font-size:11.5px;width:34px;flex:0 0 34px;color:var(--ink-2)}
.bar-row.hot .k{font-weight:700;color:var(--clay-ink)}
.bar-row .track{flex:1;height:7px;border-radius:99px;background:var(--sand);overflow:hidden}
.bar-row .track i{display:block;height:100%;border-radius:99px;background:var(--pine-2);transition:width .8s var(--ease)}
.bar-row.hot .track i{background:var(--clay)}
.bar-row .p{font-size:11px;font-weight:600;width:26px;text-align:right;flex:0 0 26px;color:var(--ink-2)}

.conclusion{margin:18px 20px 0;border-radius:20px;padding:16px 16px 15px;color:#EFF4EF;position:relative;overflow:hidden;
  background:linear-gradient(150deg,#33553F 0%,#2A4638 60%,#243B2F 100%);
  box-shadow:0 2px 6px rgba(34,54,44,.16), 0 20px 34px -20px rgba(34,54,44,.6)}
.conclusion .q{font-family:ui-serif,Georgia,serif;font-size:26px;line-height:1;color:rgba(255,255,255,.22)}
.conclusion p{font-family:ui-serif,'Noto Serif SC',Georgia,serif;font-size:13.5px;line-height:1.8;margin-top:2px}
.conclusion p b{color:#F7CE97;font-weight:600;padding:0 2px;background:linear-gradient(180deg,transparent 64%,rgba(245,201,142,.22) 64%)}
.conclusion .from{font-size:9.5px;color:rgba(239,244,239,.45);margin-top:10px;letter-spacing:.06em}

.redline{margin:16px 20px 0}
.redline .lbl{display:flex;justify-content:space-between;margin-bottom:6px}
.redline .lbl span{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);font-weight:600}
.redline .lbl em{font-style:normal;font-size:10px;color:var(--clay)}
.chk{display:flex;align-items:center;gap:9px;padding:11px 0;border-bottom:1px solid var(--line)}
.chk:last-child{border-bottom:none}
.box{width:17px;height:17px;border-radius:5px;border:1.5px solid var(--line-2);flex:0 0 17px;display:grid;place-items:center;color:#fff;transition:all .18s var(--ease)}
.box.on{background:var(--clay);border-color:var(--clay)}
.chk p{font-size:11.5px;flex:1;line-height:1.4}
.chk p.done{color:var(--ink-3);text-decoration:line-through}
.tagd{font-size:9.5px;color:var(--ink-3);background:var(--sand);padding:2px 7px;border-radius:99px;flex:0 0 auto}

.nored{margin:16px 20px 0;display:flex;align-items:center;gap:8px;padding:13px;border-radius:14px;background:var(--pine-soft);color:var(--pine);font-size:11.5px}

.cmp{padding:4px 14px;border-radius:16px}
.crow{display:flex;align-items:center;gap:10px;padding:12px 0;border-bottom:1px solid var(--line)}
.crow:last-child{border-bottom:none}
.cn{font-size:11.5px;width:96px;flex:0 0 96px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cbar{flex:1;height:6px;border-radius:99px;background:var(--sand);overflow:hidden}
.cbar i{display:block;height:100%;border-radius:99px;background:var(--pine-2);opacity:.85}
.cv{font-size:11.5px;font-weight:600;width:52px;text-align:right;flex:0 0 52px}
.footnote{font-size:10px;color:var(--ink-3);text-align:center;margin-top:14px}
</style>
