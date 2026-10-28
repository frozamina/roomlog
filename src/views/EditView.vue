<script setup>
import { computed, inject, reactive, ref } from 'vue'
import Icon from '../components/Icon.vue'
import FieldInput from '../components/FieldInput.vue'
import { go, back, scrollTop } from '../router'
import { db, DIMENSIONS, RATE_ITEMS, FIELD_GROUPS, blankProperty, today } from '../store'

const props = defineProps({ id: String, q: Object })
const toast = inject('toast')

const isNew = props.id === 'new'
const source = isNew ? null : db.properties.find(p => p.id === props.id)
const draft = reactive(source ? JSON.parse(JSON.stringify(source)) : blankProperty())
if (!draft.facts) draft.facts = {}
if (!draft.scores) draft.scores = {}
if (!draft.care) draft.care = {}

const steps = ['基本信息', '条件打分', '硬件与费用', '周边与房东']
const step = ref(Math.min(Number(props.q?.step || 0), 3))
const careKeys = ref(Object.keys(draft.care).filter(k => Number(draft.care[k]) >= 3))

const group = (key) => FIELD_GROUPS.find(g => g.key === key)

const visible = (f) => {
  if (!f.cond) return true
  const [k, v] = f.cond.split('==')
  return draft.facts[k] === v
}

const canRemove = computed(() => !isNew)

function toggleCare(k) {
  const i = careKeys.value.indexOf(k)
  i >= 0 ? careKeys.value.splice(i, 1) : careKeys.value.push(k)
}

function next() {
  if (step.value === 0 && !String(draft.name || '').trim()) {
    toast('先给它起个名字')
    return
  }
  if (step.value < steps.length - 1) {
    step.value++
    scrollTop()
  } else {
    save()
  }
}
function prev() {
  if (step.value === 0) back()
  else { step.value--; scrollTop() }
}

function save() {
  DIMENSIONS.forEach(d => {
    draft.care[d.key] = careKeys.value.includes(d.key) ? 3 : 1.5
  })
  if (!draft.startDate) draft.startDate = today()
  if (isNew) {
    db.properties.push(draft)
  } else if (source) {
    Object.assign(source, draft)
  }
  toast('已保存')
  go('detail', draft.id, { reset: false })
}

function remove() {
  if (!confirm('删除这套档案？它的账单记录会一起删掉，无法恢复。')) return
  db.properties = db.properties.filter(p => p.id !== draft.id)
  go('home', null, { reset: true })
}
</script>

<template>
  <div class="root">
    <div class="nav solid">
      <button class="nav-btn" @click="prev" aria-label="返回"><Icon name="back" :size="16" /></button>
      <div class="nav-title">{{ isNew ? '新建房源' : '编辑房源' }}</div>
      <div class="nav-spacer"></div>
      <span class="stepnum num">{{ step + 1 }} / {{ steps.length }}</span>
    </div>

    <div class="pbars">
      <i v-for="(s, i) in steps" :key="s" :class="{ on: i <= step }"></i>
    </div>

    <div class="view">
      <div class="title-block">
        <h2 class="serif">{{ steps[step] }}</h2>
        <p v-if="step === 0">先填最少的信息，其余随时能补。</p>
        <p v-else-if="step === 1">凭第一印象打分，1 分最差、5 分最好。</p>
        <p v-else-if="step === 2">这些决定了真实成本，别只看月租。</p>
        <p v-else>最后一部分，也最容易被忽略。</p>
      </div>

      <!-- 步骤 1 -->
      <div v-if="step === 0" class="sec">
        <div class="card pad">
          <div class="fld">
            <label class="lbl">房源名称 <b class="req">*</b></label>
            <input v-model="draft.name" class="inp" placeholder="如：翠湖苑 3 栋 1202" />
          </div>
          <div class="fld">
            <label class="lbl">地址 / 备注</label>
            <input v-model="draft.address" class="inp" placeholder="如：赤坎区 · 62㎡ · 2 室 1 厅" />
          </div>
          <div class="fld">
            <label class="lbl">月租 <span class="u">元</span></label>
            <input v-model.number="draft.rent" class="inp num" type="number" inputmode="numeric" placeholder="1800" />
          </div>
          <div class="row2">
            <div class="fld">
              <label class="lbl">起租日</label>
              <input v-model="draft.startDate" class="inp num" type="date" />
            </div>
            <div class="fld">
              <label class="lbl">退租日 <span class="u">空着 = 在住</span></label>
              <input v-model="draft.endDate" class="inp num" type="date" />
            </div>
          </div>
        </div>
      </div>

      <!-- 步骤 2 -->
      <div v-else-if="step === 1" class="sec">
        <div class="card">
          <div class="rate-row" v-for="it in RATE_ITEMS" :key="it.key">
            <div>
              <div class="rate-name">{{ it.label }}</div>
              <div class="rate-help">{{ it.help }}</div>
            </div>
            <div class="segs">
              <i v-for="n in 5" :key="n" :class="{ on: Number(draft.scores[it.key]) >= n }"
                 @click="draft.scores[it.key] = n"></i>
            </div>
          </div>
        </div>

        <div class="care">
          <div class="care-h">
            <span>这几项里，你最在意哪几个？</span>
            <em class="num">选 {{ careKeys.length }} 项</em>
          </div>
          <p class="care-p">最多挑 3 个。这会直接决定你的「居所指数」和下次看房的红线。</p>
          <div class="chips" style="margin-top:10px">
            <button v-for="d in DIMENSIONS" :key="d.key" class="chip sm"
                    :class="{ on: careKeys.includes(d.key) }"
                    @click="toggleCare(d.key)">{{ d.label }}</button>
          </div>
        </div>
      </div>

      <!-- 步骤 3 / 4 -->
      <div v-else class="sec">
        <div class="card pad">
          <div class="grid">
            <FieldInput v-for="f in group(step === 2 ? 'hardware' : 'area').fields" v-show="visible(f)"
                        :key="f.key" :field="f" v-model="draft.facts[f.key]" />
          </div>
        </div>
        <div class="card pad" style="margin-top:12px">
          <div class="grid">
            <FieldInput v-for="f in group(step === 2 ? 'cost' : 'people').fields" v-show="visible(f)"
                        :key="f.key" :field="f" v-model="draft.facts[f.key]" />
          </div>
        </div>

        <template v-if="step === 3">
          <div class="card pad" style="margin-top:12px">
            <div class="fld">
              <label class="lbl">一句话总结</label>
              <textarea v-model="draft.summary" class="inp ta" rows="2"
                        placeholder="三年后你只会看这一句"></textarea>
            </div>
            <div class="fld">
              <label class="lbl">会不会再租</label>
              <div class="chips">
                <button v-for="o in ['会', '不会', '看情况']" :key="o" class="chip sm"
                        :class="{ on: draft.wouldRent === o }" @click="draft.wouldRent = o">{{ o }}</button>
              </div>
            </div>
            <div class="fld" v-if="draft.endDate">
              <label class="lbl">事后回看，后悔吗</label>
              <div class="segs">
                <i v-for="n in 5" :key="n" :class="{ on: Number(draft.regret) >= n }" @click="draft.regret = n"></i>
              </div>
            </div>
          </div>
        </template>

        <button v-if="canRemove" class="del" @click="remove">
          <Icon name="trash" :size="15" /> 删除这套档案
        </button>
      </div>

      <div style="height:16px"></div>
    </div>

    <div class="foot">
      <button class="btn btn-primary" @click="next">{{ step === steps.length - 1 ? '保存' : '下一步' }}</button>
    </div>
  </div>
</template>

<style scoped>
.root{height:100%;display:flex;flex-direction:column;background:var(--paper)}
.pbars{display:flex;gap:5px;padding:2px 20px 0}
.pbars i{height:3px;flex:1;border-radius:99px;background:var(--sand-2);transition:background .3s var(--ease)}
.pbars i.on{background:var(--pine)}
.stepnum{font-size:11px;color:var(--ink-3)}

.title-block{padding:18px 20px 0}
.title-block h2{font-family:ui-serif,'Noto Serif SC',Georgia,serif;font-size:22px;font-weight:600;letter-spacing:-.01em}
.title-block p{font-size:11.5px;color:var(--ink-3);margin-top:5px;line-height:1.55}

.sec{padding:16px 16px 0}
.card.pad{padding:4px 14px 12px;border-radius:16px}

.fld{padding:11px 0;border-bottom:1px solid var(--line)}
.fld:last-child{border-bottom:none}
.lbl{display:block;font-size:11px;color:var(--ink-3);margin-bottom:4px;letter-spacing:.03em}
.lbl .u{font-size:10px;opacity:.7;margin-left:3px}
.req{color:var(--clay);font-weight:600}
.inp{width:100%;height:32px;font-size:15.5px;font-weight:500;background:none;border-bottom:1.5px solid var(--line);border-radius:0;transition:border-color .18s var(--ease)}
.inp:focus{border-bottom-color:var(--pine)}
.inp::placeholder{color:var(--line-2);font-weight:400}
.ta{height:auto;min-height:52px;font-size:14px;font-weight:400;line-height:1.55;resize:none}
.row2{display:block}
.row2 .fld:last-child{border-bottom:none}
.row2 .inp{min-width:0;width:100%}
.inp[type=date]{font-size:14.5px}

.grid{display:grid;grid-template-columns:1fr 1fr;gap:0 16px}
.grid :deep(.f){grid-column:span 2}
.grid :deep(.f.half){grid-column:span 1}

.rate-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 15px;border-bottom:1px solid var(--line)}
.rate-row:last-child{border-bottom:none}
.rate-name{font-size:14px;font-weight:500}
.rate-help{font-size:10.5px;color:var(--ink-3);margin-top:2px}
.segs{display:flex;gap:4px;flex:0 0 auto}
.segs i{width:22px;height:26px;border-radius:6px;background:var(--sand);transition:background .16s var(--ease),transform .12s var(--spring)}
.segs i.on{background:var(--pine)}
.segs i:active{transform:scale(.9)}

.care{margin-top:12px;background:var(--pine-soft);border:1px solid rgba(44,74,59,.12);border-radius:16px;padding:14px 15px}
.care-h{display:flex;justify-content:space-between;align-items:baseline;font-size:13px;font-weight:600;color:var(--pine)}
.care-h em{font-style:normal;font-size:10.5px;font-weight:500;opacity:.6}
.care-p{font-size:10.5px;color:var(--pine);opacity:.66;margin-top:5px;line-height:1.5}

.del{margin:18px auto 0;display:flex;align-items:center;gap:6px;font-size:12px;color:var(--clay);padding:10px 16px}
.foot{flex:0 0 auto;padding:10px 20px calc(8px + var(--safe-b));background:var(--paper);border-top:1px solid var(--line)}
</style>
