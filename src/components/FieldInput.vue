<script setup>
const props = defineProps({
  field: { type: Object, required: true },
  modelValue: { default: null },
  values: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['update:modelValue'])

const set = (v) => emit('update:modelValue', v)

function toggleMulti(opt) {
  const arr = Array.isArray(props.modelValue) ? [...props.modelValue] : []
  const i = arr.indexOf(opt)
  i >= 0 ? arr.splice(i, 1) : arr.push(opt)
  set(arr)
}
const has = (opt) => Array.isArray(props.modelValue) && props.modelValue.includes(opt)
</script>

<template>
  <div class="f" :class="{ half: field.half }">
    <label class="lbl">{{ field.label }}<span v-if="field.unit" class="unit">{{ field.unit }}</span></label>

    <!-- 数字 / 文本 -->
    <input v-if="field.type === 'number'" class="inp num" type="number" inputmode="decimal"
           :placeholder="field.ph || '—'" :value="modelValue ?? ''"
           @input="set($event.target.value === '' ? '' : Number($event.target.value))" />

    <input v-else-if="field.type === 'text'" class="inp" type="text"
           :placeholder="field.ph || '—'" :value="modelValue ?? ''"
           @input="set($event.target.value)" />

    <textarea v-else-if="field.type === 'textarea'" class="inp ta" rows="2"
              :placeholder="field.ph || ''" :value="modelValue ?? ''"
              @input="set($event.target.value)"></textarea>

    <input v-else-if="field.type === 'date'" class="inp num" type="date"
           :value="modelValue || ''" @input="set($event.target.value)" />

    <!-- 单选 chips -->
    <div v-else-if="field.type === 'select'" class="chips">
      <button v-for="o in field.options" :key="o" class="chip sm" :class="{ on: modelValue === o }"
              @click="set(modelValue === o ? '' : o)">{{ o }}</button>
    </div>

    <!-- 多选 chips -->
    <div v-else-if="field.type === 'multi'" class="chips">
      <button v-for="o in field.options" :key="o" class="chip sm" :class="{ on: has(o) }"
              @click="toggleMulti(o)">{{ o }}</button>
    </div>

    <!-- 五段评分 -->
    <div v-else-if="field.type === 'rate'" class="segs">
      <i v-for="n in 5" :key="n" :class="{ on: Number(modelValue) >= n }" @click="set(n)"></i>
    </div>

    <div v-if="field.hint" class="hint">{{ field.hint }}</div>
  </div>
</template>

<style scoped>
.f{padding:12px 0;border-bottom:1px solid var(--line);min-width:0}
.f:last-child{border-bottom:none}
.lbl{display:flex;align-items:baseline;gap:5px;font-size:11px;color:var(--ink-3);letter-spacing:.03em;margin-bottom:5px}
.unit{font-size:10px;color:var(--ink-3);opacity:.75}
.inp{width:100%;height:32px;font-size:15.5px;font-weight:500;background:none;border-bottom:1.5px solid var(--line);transition:border-color .18s var(--ease);border-radius:0}
.inp:focus{border-bottom-color:var(--pine)}
.inp::placeholder{color:var(--line-2);font-weight:400}
.ta{height:auto;min-height:52px;font-weight:400;font-size:14px;line-height:1.55;resize:none;padding-top:2px}
.rooms{display:flex;gap:10px}
.rm{display:flex;align-items:baseline;gap:3px;flex:1}
.rm span{font-size:11px;color:var(--ink-3)}
.chips{display:flex;flex-wrap:wrap;gap:6px;padding-top:2px}
.chip.sm{font-size:12px;padding:6px 11px}
.hint{font-size:10px;color:var(--ink-3);margin-top:5px}
.segs{display:flex;gap:4px;padding-top:2px}
.segs i{width:24px;height:26px;border-radius:6px;background:var(--sand);transition:background .16s var(--ease)}
.segs i.on{background:var(--pine)}
</style>
