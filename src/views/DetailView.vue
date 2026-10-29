<script setup>
import { computed, onMounted, ref } from 'vue'
import Icon from '../components/Icon.vue'
import PhotoViewer from '../components/PhotoViewer.vue'
import { go, back } from '../router'
import { db, DIMENSIONS, dimScore, livability, monthlyAvg, perSqm, billTotal, money, monthsBetween, isLiving, monthLabel } from '../store'
import { ensure, thumbOf } from '../photos'

const props = defineProps({ id: String })
const p = computed(() => db.properties.find(x => x.id === props.id) || db.properties[0] || { scores: {}, care: {}, facts: {}, tags: [], bills: [] })

/* ---- 照片 ---- */
const photos = computed(() => (p.value.photos || []).filter(x => x && x.id))
const photoIds = computed(() => photos.value.map(x => x.id))
// 封面用缩略图：400px 的缩略图铺 232px 高的头图足够清楚，加载还快得多
const cover = computed(() => thumbOf(photoIds.value[0]))
const viewerOn = ref(false)
const viewerAt = ref(0)
const thumb = (id) => thumbOf(id)
function openViewer(i) { viewerAt.value = i; viewerOn.value = true }
onMounted(() => ensure(photoIds.value))

const idx = computed(() => livability(p.value) || '—')

const matrix = computed(() => DIMENSIONS.map(d => {
  const s = dimScore(p.value, d)
  return { ...d, score: s, pct: Math.round(s / 5 * 100), low: s > 0 && s < 3 }
}))

const weakest = computed(() =>
  matrix.value.filter(m => m.score > 0).sort((a, b) => a.score - b.score).slice(0, 3)
)

const cost = computed(() => {
  const bills = p.value.bills || []
  const avg = monthlyAvg(p.value)
  const sqm = perSqm(p.value)
  let utilRatio = 0
  if (bills.length) {
    const t = bills.reduce((a, b) => a + billTotal(b), 0)
    const u = bills.reduce((a, b) => a + (Number(b.water?.amount) || 0) + (Number(b.elec?.amount) || 0), 0)
    utilRatio = t ? (u / t * 100) : 0
  }
  return { avg, sqm, utilRatio }
})

const period = computed(() => {
  const s = (p.value.startDate || '').slice(0, 7).replace('-', '.')
  const e = (p.value.endDate || '').slice(0, 7).replace('-', '.')
  return `${s} – ${e || '至今'} · ${monthsBetween(p.value.startDate, p.value.endDate)} 个月`
})

const openEdit = () => go('edit', p.value.id)
const openBill = () => go('bills', p.value.id)
</script>

<template>
  <div class="root">
    <div class="view">
      <div class="hero" :class="{ withph: cover }"
           :style="cover ? { backgroundImage: 'url(' + cover + ')' } : null">
        <div class="win" v-if="!cover"></div>
        <div class="shade" v-if="cover"></div>
        <div class="nav-float">
          <button class="nav-btn glass" @click="back()" aria-label="返回"><Icon name="back" :size="16" /></button>
          <button class="nav-btn glass" @click="openEdit" aria-label="编辑"><Icon name="edit" :size="16" /></button>
        </div>
      </div>

      <div class="content">
        <div class="card title-card">
          <div class="top">
            <div class="left">
              <h2 class="serif">{{ p.name }}</h2>
              <div class="sub">{{ p.address || '未填写地址' }}</div>
              <div class="chips" style="margin-top:9px">
                <span v-for="t in p.tags" :key="t" class="chip-s">{{ t }}</span>
              </div>
            </div>
            <div class="badge">
              <b class="num">{{ idx }}</b>
              <em>居所指数</em>
            </div>
          </div>

          <div class="matrix">
            <div class="mx" v-for="m in matrix" :key="m.key">
              <div class="row">
                <span>{{ m.label }}</span>
                <b class="num" :class="{ low: m.low }">{{ m.score ? m.score.toFixed(1) : '—' }}</b>
              </div>
              <div class="track"><i :class="{ low: m.low }" :style="{ width: m.pct + '%' }"></i></div>
            </div>
          </div>

          <div class="period num">{{ period }}</div>
        </div>

        <div class="pain" v-if="weakest.length">
          <h6>最弱的 {{ weakest.length }} 项</h6>
          <ul>
            <li v-for="(m, i) in weakest" :key="m.key">
              <i class="num">{{ String(i + 1).padStart(2, '0') }}</i>
              <div>
                <div class="pl"><span>{{ m.label }}</span><b class="num">{{ m.score.toFixed(1) }} / 5</b></div>
                <em>{{ m.help }}</em>
              </div>
            </li>
          </ul>
        </div>

        <div class="money card">
          <div><span>月均支出</span><b class="num">¥{{ money(cost.avg) }}</b></div>
          <div class="sep"></div>
          <div><span>每㎡成本</span><b class="num">¥{{ cost.sqm.toFixed(1) }}</b></div>
          <div class="sep"></div>
          <div><span>水电占比</span><b class="num">{{ cost.utilRatio.toFixed(0) }}%</b></div>
        </div>

        <div class="facts" v-if="p.facts && Object.keys(p.facts).length">
          <div class="frow" v-if="p.facts.rooms || p.facts.area">
            <span>面积 / 户型</span>
            <b class="num">{{ p.facts.area || '—' }}㎡ · {{ p.facts.rooms || '—' }} 室</b>
          </div>
          <div class="frow" v-if="p.facts.orientation">
            <span>朝向 / 楼层</span>
            <b>{{ p.facts.orientation }} · {{ p.facts.floor || '—' }}/{{ p.facts.totalFloor || '—' }} 层</b>
          </div>
          <div class="frow" v-if="p.facts.elevator">
            <span>上下楼</span>
            <b>{{ p.facts.elevator }}{{ p.facts.stairFloors ? ' ' + p.facts.stairFloors + ' 层' : '' }}</b>
          </div>
          <div class="frow" v-if="p.facts.utilityType">
            <span>水电性质</span>
            <b :class="{ warn: p.facts.utilityType !== '民用' }">{{ p.facts.utilityType }}
              <em v-if="p.facts.elecPrice" class="num"> · 电 {{ p.facts.elecPrice }} 元/度</em></b>
          </div>
          <div class="frow" v-if="p.facts.commute">
            <span>通勤</span>
            <b class="num">{{ p.facts.commute }} 分钟{{ p.facts.metro ? ' · ' + p.facts.metro : '' }}</b>
          </div>
          <div class="frow" v-if="p.summary">
            <span>一句话</span>
            <b class="quote">{{ p.summary }}</b>
          </div>
        </div>

        <div class="gallery" v-if="photos.length">
          <div class="section-title" style="padding-left:0;padding-right:0">
            <h5>照片</h5>
            <button @click="openViewer(0)">{{ photos.length }} 张 ›</button>
          </div>
          <div class="gstrip">
            <button class="gitem" v-for="(ph, i) in photos" :key="ph.id" @click="openViewer(i)">
              <img v-if="thumb(ph.id)" :src="thumb(ph.id)" alt="" loading="lazy" />
              <span v-else class="gmiss"><Icon name="image" :size="15" /></span>
            </button>
          </div>
        </div>

        <div class="bills" v-if="p.bills?.length">
          <div class="section-title" style="padding-left:0;padding-right:0">
            <h5>账单</h5>
            <button @click="openBill">全部 ›</button>
          </div>
          <div class="brow" v-for="b in [...p.bills].sort((a, c) => c.month.localeCompare(a.month)).slice(0, 3)" :key="b.id">
            <div class="bico">{{ b.month.slice(5) }}月</div>
            <div class="bn">
              <div class="num">水 {{ b.water?.usage || 0 }} 吨 · 电 {{ b.elec?.usage || 0 }} 度</div>
              <div class="bs">合计 ¥{{ money(billTotal(b)) }}</div>
            </div>
            <div class="ba num">¥{{ money(billTotal(b)) }}</div>
          </div>
        </div>

        <div style="height:20px"></div>
      </div>
    </div>

    <div class="actions">
      <button class="btn btn-ghost" @click="openBill">加账单</button>
      <button class="btn btn-primary" @click="openEdit">编辑这套档案</button>
    </div>

    <PhotoViewer v-if="viewerOn" :ids="photoIds" :start="viewerAt" @close="viewerOn = false" />
  </div>
</template>

<style scoped>
.root{height:100%;display:flex;flex-direction:column;background:var(--paper)}
.view{flex:1;overflow-y:auto}

.hero{height:232px;position:relative;margin-bottom:-56px;overflow:hidden;
  background:linear-gradient(150deg,#EAE1CB 0%,#DCD1B6 52%,#C9BEA4 100%)}
.hero::before{content:"";position:absolute;inset:0;background:radial-gradient(70% 90% at 16% 18%, rgba(255,253,240,.85), transparent 62%)}
.hero::after{content:"";position:absolute;left:0;right:0;bottom:0;height:40%;background:linear-gradient(180deg,transparent,rgba(251,249,243,.9))}
/* 有封面图时整块换成实拍：去掉原先那层米色渐变与白光，
   只留顶部的暗顶，保证浮在照片上的两个按钮仍然清楚 */
.hero.withph{background-size:cover;background-position:center;background-color:#C9BEA4}
.hero.withph::before{display:none}
.hero.withph::after{height:46%}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(26,19,15,.36) 0%,rgba(26,19,15,0) 40%)}
.win{position:absolute;left:40px;top:calc(var(--safe-t) + 52px);width:132px;height:150px;border-radius:2px;z-index:1;
  background:linear-gradient(170deg,#FFFDF3 0%,#FBF4DC 52%,#F2E7C9 100%);
  border:5px solid rgba(228,216,188,.9);box-shadow:0 16px 36px -16px rgba(118,108,82,.55)}
.win::before{content:"";position:absolute;left:50%;top:0;bottom:0;width:2px;margin-left:-1px;background:rgba(198,186,154,.5)}
.win::after{content:"";position:absolute;top:44%;left:0;right:0;height:2px;background:rgba(198,186,154,.5)}
.nav-float{position:absolute;top:calc(var(--safe-t) + 10px);left:16px;right:16px;display:flex;justify-content:space-between;z-index:4}
.glass{background:rgba(251,249,243,.85);backdrop-filter:blur(10px);box-shadow:0 1px 2px rgba(0,0,0,.08)}

.content{position:relative;z-index:3;padding:0 20px}
.title-card{padding:16px 16px 12px;border-radius:20px}
.title-card .top{display:flex;justify-content:space-between;gap:12px}
.title-card h2{font-size:19px;font-weight:600;letter-spacing:-.01em;line-height:1.3}
.title-card .sub{font-size:10.5px;color:var(--ink-3);margin-top:4px}
.badge{text-align:right;flex:0 0 auto}
.badge b{font-size:27px;font-weight:600;letter-spacing:-.03em;color:var(--pine);line-height:1}
.badge em{display:block;font-size:9px;color:var(--ink-3);font-style:normal;letter-spacing:.08em;margin-top:3px}

.matrix{display:grid;grid-template-columns:1fr 1fr;gap:0 14px;margin-top:14px;padding-top:12px;border-top:1px solid var(--line)}
.mx{padding:7px 0}
.mx .row{display:flex;justify-content:space-between;align-items:baseline}
.mx span{font-size:10.5px;color:var(--ink-2)}
.mx b{font-size:11.5px;font-weight:600}
.mx b.low{color:var(--clay)}
.track{height:3px;border-radius:99px;background:var(--sand-2);margin-top:6px;overflow:hidden}
.track i{display:block;height:100%;border-radius:99px;background:var(--pine);transition:width .6s var(--ease)}
.track i.low{background:var(--clay)}
.period{font-size:10px;color:var(--ink-3);margin-top:10px;padding-top:9px;border-top:1px solid var(--line)}

.pain{margin-top:14px;background:var(--clay-soft);border:1px solid rgba(191,106,69,.16);border-radius:16px;padding:13px 15px}
.pain h6{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--clay-ink);font-weight:700;opacity:.85}
.pain ul{margin-top:9px;display:flex;flex-direction:column;gap:10px}
.pain li{display:flex;gap:9px}
.pain li > div{flex:1;min-width:0}
.pain li i{font-style:normal;font-size:9.5px;font-weight:700;opacity:.45;flex:0 0 14px;padding-top:2px;color:var(--clay-ink)}
.pain .pl{display:flex;justify-content:space-between;font-size:12px;color:var(--clay-ink);font-weight:500}
.pain .pl b{font-weight:600;opacity:.75}
.pain em{display:block;font-style:normal;font-size:10.5px;color:var(--clay-ink);opacity:.62;margin-top:1px}

.money{display:flex;align-items:center;justify-content:space-between;margin-top:14px;padding:12px 14px;border-radius:14px}
.money div span{font-size:10px;color:var(--ink-3);display:block;letter-spacing:.04em}
.money div b{font-size:16px;font-weight:600;margin-top:1px;display:block}
.money .sep{width:1px;height:22px;background:var(--line)}

.facts{margin-top:14px;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:4px 14px;box-shadow:var(--sh-1)}
.frow{display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding:10px 0;border-bottom:1px solid var(--line)}
.frow:last-child{border-bottom:none}
.frow span{font-size:11px;color:var(--ink-3);flex:0 0 auto}
.frow b{font-size:12px;font-weight:500;text-align:right}
.frow b.warn{color:var(--clay-ink)}
.frow em{font-style:normal;color:var(--ink-3);font-weight:400}
.frow b.quote{font-weight:400;color:var(--ink-2);line-height:1.5}

.gstrip{display:flex;gap:8px;overflow-x:auto;padding-bottom:3px;scroll-snap-type:x mandatory}
.gstrip::-webkit-scrollbar{display:none}
.gitem{flex:0 0 84px;width:84px;height:84px;border-radius:12px;overflow:hidden;
  background:var(--sand);scroll-snap-align:start;transition:transform .16s var(--ease)}
.gitem:active{transform:scale(.95)}
.gitem img{width:100%;height:100%;object-fit:cover;display:block}
/* 记录还在但图片数据没了（清过站点数据、或存储被系统回收）
   时给个占位，否则 <img> 会显示成破图 */
.gmiss{display:grid;place-items:center;width:100%;height:100%;color:var(--ink-3)}

.bills{margin-top:4px}
.brow{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--line)}
.brow:last-child{border-bottom:none}
.bico{width:30px;height:30px;border-radius:9px;background:var(--sand);display:grid;place-items:center;font-size:9.5px;color:var(--ink-2);flex:0 0 30px}
.bn{flex:1;min-width:0}
.bn div:first-child{font-size:12px}
.bs{font-size:9.5px;color:var(--ink-3);margin-top:1px}
.ba{font-size:12.5px;font-weight:600}

.actions{flex:0 0 auto;display:flex;gap:9px;padding:12px 20px calc(10px + var(--safe-b));
  background:linear-gradient(180deg,rgba(251,249,243,0),var(--paper) 34%);border-top:1px solid var(--line)}
.actions .btn-ghost{flex:1}
.actions .btn-primary{flex:1.5}
</style>
