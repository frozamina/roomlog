<script setup>
const props = defineProps({ name: String, size: [Number, String], sw: [Number, String] })

const P = {
  home: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  more: '<circle cx="12" cy="5" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="12" cy="19" r="1.3"/>',
  edit: '<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z"/>',
  trash: '<path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/>',
  chevron: '<path d="M9 5l7 7-7 7"/>',
  check: '<path d="M4 13l5 5L20 7"/>',
  download: '<path d="M12 4v11M8 11l4 4 4-4M4 20h16"/>',
  compare: '<path d="M12 3v18M6 8L3 12l3 4M18 8l3 4-3 4"/>',
  bolt: '<path d="M13 2 5 14h6l-1 8 8-12h-6z"/>',
  water: '<path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  camera: '<path d="M4 8h3l2-2h6l2 2h3v12H4z"/><circle cx="12" cy="13" r="3.2"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  calendar: '<rect x="4" y="6" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>'
}
</script>

<template>
  <svg :width="size || 20" :height="size || 20" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" :stroke-width="sw || 1.7" stroke-linecap="round" stroke-linejoin="round"
       v-html="P[name] || ''" />
</template>
