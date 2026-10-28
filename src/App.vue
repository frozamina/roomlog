<script setup>
import { computed, ref, provide, onMounted } from 'vue'
import Icon from './components/Icon.vue'
import { route, go, back, current } from './router'
import HomeView from './views/HomeView.vue'
import DetailView from './views/DetailView.vue'
import EditView from './views/EditView.vue'
import BillsView from './views/BillsView.vue'
import InsightsView from './views/InsightsView.vue'
import CompareView from './views/CompareView.vue'
import SettingsView from './views/SettingsView.vue'

const views = {
  home: HomeView, detail: DetailView, edit: EditView,
  bills: BillsView, insights: InsightsView, compare: CompareView, settings: SettingsView
}
const cur = computed(() => current())
const comp = computed(() => views[cur.value.name] || HomeView)
const showTab = computed(() => ['home', 'bills', 'insights', 'settings'].includes(cur.value.name))

const tabs = [
  { key: 'home', label: '房源', icon: 'home' },
  { key: 'bills', label: '账单', icon: 'receipt' },
  { key: 'insights', label: '洞察', icon: 'chart' },
  { key: 'settings', label: '我的', icon: 'user' }
]

// 安卓实体返回键：先退栈，退无可退才退出 App
onMounted(async () => {
  try {
    const { App: CapApp } = await import('@capacitor/app')
    CapApp.addListener('backButton', () => {
      if (route.stack.length > 1) back()
      else CapApp.exitApp()
    })
  } catch (e) { /* Web 环境下忽略 */ }
})

const toastMsg = ref('')
let timer = null
provide('toast', (m) => {
  toastMsg.value = m
  clearTimeout(timer)
  timer = setTimeout(() => { toastMsg.value = '' }, 2000)
})
</script>

<template>
  <div class="app">
    <component :is="comp" :id="cur.id" :q="cur.q" :key="cur.name + (cur.id || '')" />

    <nav class="tabbar" v-if="showTab">
      <button v-for="t in tabs" :key="t.key" class="tab" :class="{ on: cur.name === t.key }"
              @click="go(t.key, null, { reset: true })">
        <Icon :name="t.icon" :size="21" />
        <span>{{ t.label }}</span>
      </button>
    </nav>

    <Transition name="fade">
      <div class="toast" v-if="toastMsg">{{ toastMsg }}</div>
    </Transition>
  </div>
</template>
