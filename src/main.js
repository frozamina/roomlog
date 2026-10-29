import { createApp } from 'vue'
import App from './App.vue'
import { load, db } from './store'
import { sweepOrphans } from './photos'
import './style.css'

// 必须在任何组件 setup 之前完成读取，否则深链进入编辑页会拿到空数据
load()

// 清掉没被任何房源引用的照片：新建房源时拍了照又放弃保存，会留下这种孤儿。
// 放在启动时跑，此刻不可能有正在编辑的草稿，删起来安全。
setTimeout(() => {
  const refs = []
  for (const p of db.properties) {
    for (const ph of (p.photos || [])) if (ph && ph.id) refs.push(ph.id)
  }
  sweepOrphans(refs)
}, 1200)

createApp(App).mount('#app')
