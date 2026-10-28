import { reactive, watch } from 'vue'

/* ================= 常量与配置 ================= */

const KEY = 'juzhi.v1'

// 参与评分与洞察的维度
export const DIMENSIONS = [
  { key: 'noise',   label: '隔音', fields: ['noise_out', 'noise_in'], help: '临街、楼上脚步', check: '晚上 9 点后在卧室静坐 3 分钟，听楼上和窗外' },
  { key: 'light',   label: '采光', fields: ['light'],   help: '日均直射日照',   check: '下午 3 点看客厅是否还需要开灯' },
  { key: 'water',   label: '水压', fields: ['water'],   help: '晚高峰淋浴',     check: '打开淋浴，同时开厨房水龙头' },
  { key: 'vent',    label: '通风', fields: ['vent'],    help: '能否穿堂风',     check: '打开门窗，感受是否有穿堂风' },
  { key: 'damp',    label: '潮湿', fields: ['damp'],    help: '霉斑、返潮',     check: '看卫生间排风与墙角有没有霉斑' },
  { key: 'thermal', label: '保温', fields: ['thermal'], help: '西晒、冬天保暖', check: '问清朝向与西晒时段' }
]

// 评分页逐项（比维度更细，隔音拆成窗外与楼板）
export const RATE_ITEMS = [
  { key: 'noise_out', label: '隔音 · 窗外', help: '临街、高架、学校、施工' },
  { key: 'noise_in',  label: '隔音 · 楼板', help: '楼上脚步、隔壁说话' },
  { key: 'light',     label: '采光',       help: '日均直射日照' },
  { key: 'water',     label: '水压',       help: '晚高峰淋浴是否稳定' },
  { key: 'vent',      label: '通风',       help: '能否形成穿堂风' },
  { key: 'damp',      label: '潮湿',       help: '霉斑、返潮' },
  { key: 'thermal',   label: '保温',       help: '西晒、冬天保暖' }
]

export const CARE_LEVELS = [
  { v: 1, label: '一般' },
  { v: 2, label: '比较在意' },
  { v: 3, label: '非常在意' }
]

// 非评分的客观字段字典（表单自动渲染）
export const FIELD_GROUPS = [
  {
    key: 'basic', label: '基本信息', desc: '这套房子长什么样',
    fields: [
      { key: 'area',        label: '面积',     type: 'number', unit: '㎡', half: true, ph: '62' },
      { key: 'rooms',       label: '几室',     type: 'number', half: true, ph: '2' },
      { key: 'halls',       label: '几厅',     type: 'number', half: true, ph: '1' },
      { key: 'baths',       label: '几卫',     type: 'number', half: true, ph: '1' },
      { key: 'floor',       label: '所在楼层', type: 'number', half: true, ph: '12' },
      { key: 'totalFloor',  label: '总层数',   type: 'number', half: true, ph: '18' },
      { key: 'orientation', label: '朝向',     type: 'select', options: ['南', '东南', '西南', '东', '西', '北', '南北通透'] },
      { key: 'builtYear',   label: '建成年份', type: 'number', half: true, ph: '2015' }
    ]
  },
  {
    key: 'hardware', label: '硬件与家电', desc: '决定日常顺手不顺手',
    fields: [
      { key: 'elevator',  label: '上下楼',   type: 'select', options: ['有电梯', '步梯'] },
      { key: 'stairFloors', label: '台阶层数', type: 'number', cond: 'elevator==步梯', half: true, ph: '7' },
      { key: 'heater',    label: '热水器',   type: 'select', options: ['燃气', '电热', '集中供热', '太阳能'] },
      { key: 'bathroom',  label: '卫生间',   type: 'select', options: ['独卫', '合卫'] },
      { key: 'ac',        label: '空调台数', type: 'number', half: true, ph: '2' },
      { key: 'balcony',   label: '阳台',     type: 'select', options: ['有', '无'] },
      { key: 'appliances', label: '家电家具', type: 'multi', options: ['冰箱', '洗衣机', '燃气灶', '油烟机', '微波炉', '电视', '衣柜', '书桌', '沙发'] },
      { key: 'flags',     label: '其他',     type: 'multi', options: ['可养宠', '可做饭', '可改造', '有快递柜', '外卖上楼'] }
    ]
  },
  {
    key: 'cost', label: '费用规则', desc: '决定真实成本，别只看月租',
    fields: [
      { key: 'utilityType', label: '水电性质', type: 'select', options: ['民用', '商用', '二房东加价'], hint: '直接影响单价，商电常是民电的 2 倍' },
      { key: 'elecPrice',   label: '电费单价', type: 'number', unit: '元/度', half: true, ph: '0.65' },
      { key: 'waterPrice',  label: '水费单价', type: 'number', unit: '元/吨', half: true, ph: '3.7' },
      { key: 'deposit',     label: '押付方式', type: 'select', options: ['押一付一', '押一付三', '押二付一', '押一付六'] },
      { key: 'agencyFee',   label: '中介费',   type: 'number', unit: '元', half: true, ph: '900' },
      { key: 'propertyFee', label: '物业费',   type: 'number', unit: '元/月', half: true, ph: '120' },
      { key: 'manageFee',   label: '管理费',   type: 'number', unit: '元/月', half: true, ph: '0' },
      { key: 'netFee',      label: '网络费',   type: 'number', unit: '元/月', half: true, ph: '60' },
      { key: 'parkingFee',  label: '车位费',   type: 'number', unit: '元/月', half: true, ph: '0' }
    ]
  },
  {
    key: 'area', label: '周边与通勤', desc: '每天都要面对的部分',
    fields: [
      { key: 'commute',    label: '门到门通勤', type: 'number', unit: '分钟', half: true, ph: '22' },
      { key: 'metro',      label: '最近地铁/公交', type: 'text', half: true, ph: '3 号线 · 步行 400m' },
      { key: 'market',     label: '菜场步行', type: 'number', unit: '分钟', half: true, ph: '5' },
      { key: 'supermarket', label: '超市步行', type: 'number', unit: '分钟', half: true, ph: '8' },
      { key: 'nightsafe',  label: '夜间照明与治安', type: 'rate', half: false }
    ]
  },
  {
    key: 'people', label: '房东与合同', desc: '住得好不好，一半看人',
    fields: [
      { key: 'landlord',  label: '房东响应', type: 'rate', hint: '报修后多久来、态度如何' },
      { key: 'contractStart', label: '合同开始', type: 'date', half: true },
      { key: 'contractEnd',   label: '合同结束', type: 'date', half: true },
      { key: 'minTerm',   label: '最短租期', type: 'number', unit: '月', half: true, ph: '12' },
      { key: 'renewRaise', label: '续租涨幅', type: 'number', unit: '%', half: true, ph: '6' },
      { key: 'landlordNote', label: '房东备注', type: 'textarea', ph: '修东西快，但涨租不手软' }
    ]
  }
]

/* ================= 工具 ================= */

export const uid = () => Math.random().toString(36).slice(2, 9)
export const today = () => new Date().toISOString().slice(0, 10)
export const thisMonth = () => new Date().toISOString().slice(0, 7)
export const money = (n) => (Math.round((Number(n) || 0) * 100) / 100).toLocaleString('zh-CN')
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n))

export function monthLabel(m) {
  const [y, mm] = m.split('-')
  return `${y} 年 ${Number(mm)} 月`
}
export function monthsBetween(start, end) {
  if (!start) return 1
  const s = new Date(start), e = end ? new Date(end) : new Date()
  return Math.max(1, Math.round((e - s) / 86400000 / 30.4))
}

/* ================= 状态 ================= */

export const db = reactive({ properties: [], settings: { seeded: false } })

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      properties: db.properties,
      settings: db.settings
    }))
  } catch (e) { console.warn('保存失败', e) }
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const data = JSON.parse(raw)
      db.properties = data.properties || []
      db.settings = data.settings || { seeded: false }
      return
    }
  } catch (e) { console.warn('读取失败', e) }
  seed()
}

watch(db, save, { deep: true })

/* ================= 房源模型 ================= */

export function blankProperty() {
  return {
    id: uid(),
    name: '', address: '', rent: '', startDate: today(), endDate: '',
    scores: {}, care: {}, facts: {}, tags: [],
    summary: '', wouldRent: '', regret: 0,
    photos: [], bills: []
  }
}

export const isLiving = (p) => !p.endDate

export function sortedProperties() {
  return [...db.properties].sort((a, b) => {
    if (isLiving(a) && !isLiving(b)) return -1
    if (!isLiving(a) && isLiving(b)) return 1
    return (b.startDate || '').localeCompare(a.startDate || '')
  })
}

/* ================= 计算 ================= */

/** 某一维度的实测分（多字段取均值），无数据返回 0 */
export function dimScore(p, dim) {
  const vals = dim.fields.map(f => Number(p.scores?.[f])).filter(v => v > 0)
  if (!vals.length) return 0
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

/** 居所指数 0–100 = Σ(分×在意度) / Σ(5×在意度) */
export function livability(p) {
  let sw = 0, sv = 0
  for (const d of DIMENSIONS) {
    const s = dimScore(p, d)
    if (!s) continue
    const w = Number(p.care?.[d.key] || 2)
    sw += w; sv += s * w
  }
  if (!sw) return 0
  return Math.round((sv / (sw * 5)) * 100)
}

/** 单月账单总额 */
export function billTotal(b) {
  const n = (x) => Number(x) || 0
  const other = (b.other || []).reduce((a, o) => a + n(o.amount), 0)
  return n(b.rent) + n(b.water?.amount) + n(b.elec?.amount) + n(b.gas?.amount)
    + n(b.property) + n(b.manageFee) + n(b.net) + n(b.parking) + other
}

/** 某房源的月均支出（优先用账单均值，无账单则用规则估算） */
export function monthlyAvg(p) {
  const bills = p.bills || []
  if (bills.length) {
    return Math.round(bills.reduce((a, b) => a + billTotal(b), 0) / bills.length)
  }
  const f = p.facts || {}
  return Math.round((Number(p.rent) || 0) + (Number(f.propertyFee) || 0)
    + (Number(f.manageFee) || 0) + (Number(f.netFee) || 0))
}

/** 每㎡成本 */
export function perSqm(p) {
  const a = Number(p.facts?.area) || 0
  if (!a) return 0
  return monthlyAvg(p) / a
}

/** 累计支出 */
export function totalSpent() {
  return db.properties.reduce((sum, p) => {
    const bills = p.bills || []
    if (bills.length) return sum + bills.reduce((a, b) => a + billTotal(b), 0)
    return sum + monthlyAvg(p) * monthsBetween(p.startDate, p.endDate)
  }, 0)
}

export function totalMonths() {
  return db.properties.reduce((a, p) => a + monthsBetween(p.startDate, p.endDate), 0)
}

/** 偏好权重画像：把「在意度」和「实际落差」合成 0–100 的指数 */
export function preferenceProfile() {
  const props = db.properties.filter(p => livability(p) > 0)
  const rows = DIMENSIONS.map(d => {
    let careSum = 0, scoreSum = 0, n = 0
    for (const p of props) {
      const s = dimScore(p, d)
      if (!s) continue
      careSum += Number(p.care?.[d.key] || 2)
      scoreSum += s
      n++
    }
    const care = n ? careSum / n : 2
    const avg = n ? scoreSum / n : 0
    // 权重 = 显性在意度 × (1 + 落差加成)，落差越大越说明这项是隐性痛点
    const gap = avg ? (5 - avg) / 5 : 0.5
    const raw = care * (1 + 0.45 * gap)
    return { key: d.key, label: d.label, care, avg, gap, raw, samples: n, check: d.check }
  })
  const max = Math.max(...rows.map(r => r.raw), 0.001)
  const min = Math.min(...rows.map(r => r.raw))
  return rows
    .map(r => ({ ...r, pct: Math.round(45 + 55 * ((r.raw - min) / (max - min || 1))) }))
    .sort((a, b) => b.pct - a.pct)
}

/** 红线条件：在意度 ≥ 2 且历史平均 < 3.0 */
export function redLines() {
  return preferenceProfile().filter(r => r.care >= 1.8 && r.avg > 0 && r.avg < 3.5 && r.samples > 0)
}

/** 生成一句人话结论 */
export function insightSentence() {
  const rows = preferenceProfile().filter(r => r.samples > 0)
  if (!rows.length) return null
  const worst = [...rows].sort((a, b) => (b.care * (5 - b.avg)) - (a.care * (5 - a.avg)))[0]
  const overpaid = Math.round((Number(db.properties[0]?.rent) || 1800) * 0.06)
  return { dim: worst, overpaid, count: db.properties.filter(p => livability(p) > 0).length }
}

/* ================= 示例数据 ================= */

export function seed() {
  if (db.properties.length) return
  const mk = (o) => Object.assign(blankProperty(), o)
  db.properties = [
    mk({
      id: 'demo1', name: '翠湖苑 3 栋 1202', address: '湛江市赤坎区 · 62㎡ · 2 室 1 厅',
      rent: 1800, startDate: '2025-08-01', endDate: '',
      scores: { noise_out: 5, noise_in: 4, light: 4, water: 2, vent: 4, damp: 3, thermal: 3 },
      care: { noise: 3, light: 2, water: 3, vent: 2, damp: 2, thermal: 2 },
      facts: {
        area: 62, rooms: 2, halls: 1, floor: 12, totalFloor: 18, orientation: '南',
        elevator: '有电梯', heater: '燃气', bathroom: '独卫', ac: 2, balcony: '有',
        appliances: ['冰箱', '洗衣机', '燃气灶', '油烟机', '衣柜', '床'],
        utilityType: '民用', elecPrice: 0.69, waterPrice: 3.7, deposit: '押一付三',
        agencyFee: 900, propertyFee: 120, manageFee: 0, netFee: 60, commute: 22,
        metro: '3 号线 · 步行 400m', market: 5, supermarket: 8, nightsafe: 4, landlord: 5
      },
      tags: ['电梯', '燃气', '独卫', '民电'],
      summary: '采光很好，就是水压差点意思', wouldRent: '会', regret: 1,
      bills: [
        { id: uid(), month: '2026-07', rent: 1800, water: { usage: 13.1, price: 3.7, amount: 48 }, elec: { usage: 235, price: 0.69, amount: 162 }, gas: { usage: 8, amount: 32 }, property: 120, manageFee: 0, net: 60, other: [] },
        { id: uid(), month: '2026-08', rent: 1800, water: { usage: 14.2, price: 3.7, amount: 53 }, elec: { usage: 268, price: 0.69, amount: 185 }, gas: { usage: 9, amount: 36 }, property: 120, manageFee: 0, net: 60, other: [{ name: '保洁', amount: 120 }] },
        { id: uid(), month: '2026-09', rent: 1800, water: { usage: 11.8, price: 3.7, amount: 44 }, elec: { usage: 214, price: 0.69, amount: 148 }, gas: { usage: 7, amount: 28 }, property: 120, manageFee: 0, net: 60, other: [] },
        { id: uid(), month: '2026-10', rent: 1800, water: { usage: 12.4, price: 3.7, amount: 46 }, elec: { usage: 186, price: 0.69, amount: 128 }, gas: { usage: 8, amount: 32 }, property: 120, manageFee: 0, net: 60, other: [] }
      ]
    }),
    mk({
      id: 'demo2', name: '海湾新村 A 座 705', address: '湛江市霞山区 · 48㎡ · 1 室 1 厅',
      rent: 1500, startDate: '2023-06-01', endDate: '2025-08-01',
      scores: { noise_out: 2, noise_in: 2, light: 3, water: 3, vent: 3, damp: 2, thermal: 3 },
      care: { noise: 3, light: 2, water: 2, vent: 2, damp: 2, thermal: 1 },
      facts: {
        area: 48, rooms: 1, halls: 1, floor: 7, totalFloor: 8, orientation: '东',
        elevator: '步梯', stairFloors: 7, heater: '电热', bathroom: '合卫', ac: 1, balcony: '无',
        utilityType: '二房东加价', elecPrice: 1.2, waterPrice: 4.5, deposit: '押一付一',
        agencyFee: 0, propertyFee: 0, manageFee: 50, netFee: 60, commute: 34,
        metro: '公交站 · 步行 600m', market: 12, supermarket: 10, nightsafe: 3, landlord: 3
      },
      tags: ['步梯 7 楼', '临街', '合租'],
      summary: '便宜，但夏天贵、晚上吵', wouldRent: '不会', regret: 4,
      bills: [
        { id: uid(), month: '2025-07', rent: 1500, water: { usage: 9.2, price: 4.5, amount: 41 }, elec: { usage: 310, price: 1.2, amount: 372 }, gas: { usage: 0, amount: 0 }, property: 0, manageFee: 50, net: 60, other: [] },
        { id: uid(), month: '2025-08', rent: 1500, water: { usage: 8.8, price: 4.5, amount: 40 }, elec: { usage: 288, price: 1.2, amount: 346 }, gas: { usage: 0, amount: 0 }, property: 0, manageFee: 50, net: 60, other: [] }
      ]
    }),
    mk({
      id: 'demo3', name: '金沙湾单间 1801', address: '湛江市赤坎区 · 32㎡ · 单间',
      rent: 1350, startDate: '2022-09-01', endDate: '2023-05-01',
      scores: { noise_out: 3, noise_in: 3, light: 5, water: 4, vent: 3, damp: 4, thermal: 2 },
      care: { noise: 2, light: 3, water: 2, vent: 1, damp: 1, thermal: 2 },
      facts: {
        area: 32, rooms: 1, halls: 0, floor: 18, totalFloor: 32, orientation: '东南',
        elevator: '有电梯', heater: '电热', bathroom: '独卫', ac: 1, balcony: '有',
        utilityType: '商用', elecPrice: 1.05, waterPrice: 4.2, deposit: '押一付一',
        agencyFee: 675, propertyFee: 0, manageFee: 0, netFee: 60, commute: 40,
        metro: '2 号线 · 步行 900m', market: 15, supermarket: 6, nightsafe: 4, landlord: 4
      },
      tags: ['采光好', '商电', '单间'],
      summary: '光线无敌，但西晒和商电挺贵', wouldRent: '看情况', regret: 3,
      bills: [
        { id: uid(), month: '2023-04', rent: 1350, water: { usage: 6.1, price: 4.2, amount: 26 }, elec: { usage: 168, price: 1.05, amount: 176 }, gas: { usage: 0, amount: 0 }, property: 0, manageFee: 0, net: 60, other: [] }
      ]
    })
  ]
  db.settings.seeded = true
  save()
}

export function clearAll() {
  db.properties = []
  db.settings.seeded = false
  save()
}
