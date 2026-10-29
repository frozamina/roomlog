<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import Icon from './Icon.vue'
import { cache, ensure, fullOf } from '../photos'
import { registerOverlay } from '../overlay'

const props = defineProps({
  ids: { type: Array, default: () => [] },
  start: { type: Number, default: 0 }
})
const emit = defineEmits(['close'])

const i = ref(Math.min(props.start, Math.max(props.ids.length - 1, 0)))
const total = computed(() => props.ids.length)
const curId = computed(() => props.ids[i.value])
const src = computed(() => fullOf(curId.value))
const ready = computed(() => !!cache[curId.value]?.full)
// ensure 跑完仍没有数据，说明图片本体丢了（记录还在），别一直转圈
const missing = computed(() => !!curId.value && !!cache[curId.value] && !cache[curId.value].full)

const step = (d) => {
  if (total.value < 2) return
  i.value = (i.value + d + total.value) % total.value
}

/* 触摸：横向滑动翻页，纵向下拉关闭 */
let sx = 0, sy = 0, dx = 0, dy = 0, dragging = false
const shift = ref(0)
const dragY = ref(0)
const leaving = ref(false)

function onStart(e) {
  const t = e.touches[0]
  sx = t.clientX; sy = t.clientY
  dx = 0; dy = 0; dragging = true
  shift.value = 0; dragY.value = 0
}
function onMove(e) {
  if (!dragging) return
  const t = e.touches[0]
  dx = t.clientX - sx
  dy = t.clientY - sy
  if (Math.abs(dx) > Math.abs(dy)) {
    shift.value = total.value > 1 ? dx : dx * 0.25
  } else if (dy > 0) {
    dragY.value = dy
  }
}
function onEnd() {
  if (!dragging) return
  dragging = false
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) && total.value > 1) {
    step(dx < 0 ? 1 : -1)
  } else if (dy > 110 && Math.abs(dy) > Math.abs(dx)) {
    emit('close')
  }
  shift.value = 0
  dragY.value = 0
}

function onKey(e) {
  if (e.key === 'Escape') emit('close')
  else if (e.key === 'ArrowRight') step(1)
  else if (e.key === 'ArrowLeft') step(-1)
}

watch(() => props.ids, (v) => ensure(v), { immediate: true })

let unregister = null
onMounted(() => {
  window.addEventListener('keydown', onKey)
  // 让系统返回键先关这一层，而不是退掉底下的页面
  unregister = registerOverlay(() => emit('close'))
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  if (unregister) unregister()
})
</script>

<template>
  <div class="pv" :style="{ transform: dragY ? `translateY(${dragY}px)` : '', opacity: dragY ? 1 - Math.min(dragY / 420, .45) : 1 }"
       @touchstart.passive="onStart" @touchmove.passive="onMove" @touchend="onEnd" @click.self="emit('close')">
    <div class="bar">
      <button class="pbtn" @click="emit('close')" aria-label="关闭"><Icon name="close" :size="18" :sw="2.2" /></button>
      <span class="cnt num" v-if="total > 1">{{ i + 1 }} / {{ total }}</span>
      <span class="cnt" v-else>照片</span>
    </div>

    <div class="stage" @click.self="emit('close')">
      <img v-if="src" :key="curId" :src="src" alt=""
           :style="{ transform: shift ? `translateX(${shift}px)` : '' }"
           :class="{ drag: dragging, ready }" />
      <div class="wait" v-else>
        <span v-if="missing" class="gone">这张照片的数据已丢失</span>
        <span v-else class="spin"></span>
      </div>
    </div>

    <template v-if="total > 1">
      <button class="arrow l" @click.stop="step(-1)" aria-label="上一张"><Icon name="back" :size="18" :sw="2.2" /></button>
      <button class="arrow r" @click.stop="step(1)" aria-label="下一张"><Icon name="chevron" :size="18" :sw="2.2" /></button>
      <div class="dots">
        <i v-for="(id, k) in ids" :key="id" :class="{ on: k === i }"></i>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* 必须是实色：留 3% 透明度时，底下详情页的白卡文字会透出来，
   看着像渲染出错。 */
.pv{position:fixed;inset:0;z-index:80;background:#14100C;
  display:flex;flex-direction:column;animation:pvIn .2s var(--ease);
  transition:transform .24s var(--ease),opacity .2s var(--ease);touch-action:none}
@keyframes pvIn{from{opacity:0}}

.bar{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;
  padding:calc(var(--safe-t) + 12px) 16px 6px;position:relative;z-index:2}
.pbtn{width:38px;height:38px;border-radius:99px;display:grid;place-items:center;
  background:rgba(255,255,255,.12);color:#fff;transition:transform .15s var(--ease)}
.pbtn:active{transform:scale(.9)}
.cnt{font-size:11.5px;color:rgba(255,255,255,.62);letter-spacing:.1em}

.stage{flex:1;display:grid;place-items:center;padding:6px 12px calc(58px + var(--safe-b));overflow:hidden}
.stage img{max-width:100%;max-height:100%;object-fit:contain;border-radius:6px;
  opacity:0;transition:opacity .25s var(--ease),transform .28s var(--ease);
  box-shadow:0 24px 60px -20px rgba(0,0,0,.7);will-change:transform}
.stage img.ready{opacity:1}
.stage img.drag{transition:opacity .2s var(--ease)}

.wait{display:grid;place-items:center;width:100%;height:100%}
.spin{width:26px;height:26px;border-radius:99px;border:2px solid rgba(255,255,255,.22);
  border-top-color:rgba(255,255,255,.8);animation:sp .8s linear infinite}
.gone{font-size:12px;color:rgba(255,255,255,.5);letter-spacing:.04em}
@keyframes sp{to{transform:rotate(360deg)}}

.arrow{position:absolute;top:50%;margin-top:-19px;width:38px;height:38px;border-radius:99px;
  display:grid;place-items:center;background:rgba(255,255,255,.1);color:rgba(255,255,255,.82);
  transition:transform .15s var(--ease),background .15s var(--ease)}
.arrow:active{transform:scale(.9);background:rgba(255,255,255,.18)}
.arrow.l{left:10px}
.arrow.r{right:10px}

.dots{position:absolute;left:0;right:0;bottom:calc(22px + var(--safe-b));display:flex;justify-content:center;gap:5px}
.dots i{width:5px;height:5px;border-radius:99px;background:rgba(255,255,255,.28);transition:all .2s var(--ease)}
.dots i.on{background:rgba(255,255,255,.9);width:14px}

@media (max-width:430px){
  .arrow{display:none}
}
</style>
