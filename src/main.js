import { createApp } from 'vue'
import App from './App.vue'
import { load } from './store'
import './style.css'

// 必须在任何组件 setup 之前完成读取，否则深链进入编辑页会拿到空数据
load()

createApp(App).mount('#app')
