/* 可被安卓返回键关闭的浮层登记处。
   浮层（全屏看图、底部弹层）盖在页面上时，系统返回键应该先关浮层，
   而不是把下面的页面退掉——否则用户看完照片按返回，会直接回到首页。 */

const stack = []

/** 登记一层浮层，返回注销函数 */
export function registerOverlay(close) {
  const entry = { close }
  stack.push(entry)
  return () => {
    const i = stack.indexOf(entry)
    if (i >= 0) stack.splice(i, 1)
  }
}

/** 关掉最上面那层，返回是否关掉了 */
export function closeTopOverlay() {
  const top = stack[stack.length - 1]
  if (!top) return false
  top.close()
  return true
}
