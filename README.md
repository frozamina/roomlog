# 居志 RoomLog

记录每一次租房的条件与开销，住过几套之后，你会知道自己真正在意的是什么。

不是什么租房 App 的竞品——它只服务一个人：你自己。数据全在手机本地，不联网、不注册、不上传。

---

## 它解决什么问题

租房决策里最难的不是找房，是**记住**。上一个房子水压到底行不行？朝北那间冬天冷不冷？月均电费到底花了几百？——这些全都靠模糊印象，于是每次都在同一个坑里摔一遍。

居志把这件事拆成三层：

| 层 | 动作 | 产出 |
|---|---|---|
| **记录** | 住进去时打分、每月记账 | 一套房 = 一份结构化档案 |
| **复盘** | 换房时回看历史 | 六个维度的横向对比 |
| **决策** | 用得够久以后 | 「你最在意什么」「什么条件绝不能退让」 |

第三层是真正的目的。前两层只是喂数据。

---

## 核心概念

### 六个居住维度

| 维度 | 覆盖的内容 |
|---|---|
| 隔音 | 窗外噪音、楼板隔音、邻居声音 |
| 采光 | 日照时长、朝向、遮挡 |
| 水压 | 水压大小、热水器、出水量 |
| 通风 | 通透性、开窗风感 |
| 防潮 | 墙面返潮、霉味、地下水位 |
| 温度 | 冬冷夏热、空调效果、保温 |

每个维度由 1–2 个具体评分项取均值算出，避免"整体感觉"这种没法比较的模糊判断。

### 居所指数

```
居所指数 = Σ(维度得分 × 你的在意度) / Σ(5 × 在意度) × 100
```

不是简单平均。你在意的维度权重高，不在意的维度再差也不怎么扣分。同样一套 3.5 分的房子，对"只要安静"的人和"只要采光好"的人，意义完全不同。

### 偏好权重

洞察页的条形图不是直接取你填的在意度，中间夹了一层**落差修正**：

```
偏好权重 = 显性在意度 × (1 + 0.45 × 落差)
落差 = (5 − 该维度历史均分) / 5
```

意思是：你说你在意采光（显性），但过去住的房子采光都还行（落差小），那这个"在意"可能是自我想象；反过来你说不在意、但历史上一直踩坑，说明身体比嘴诚实。两层数据打架的时候，结构化的复盘数据更可信。

### 红线条件

```
在意度 ≥ 1.8 且 历史均分 < 3.5  →  自动进红线清单
```

这些是换房时**不该妥协**的项。列表可以手动勾掉——勾掉不代表数据变了，是承认"这次我认了"。

---

## 技术选型

Vue 3 + Vite 6 + Capacitor 7。

不用 Flutter 的原因很实际：最初 PRD 写的是 Flutter，但开发机没有 Java / Android SDK / Gradle，Flutter 代码一行都跑不起来，等于盲写。而 Vue 可以直接在浏览器里真实渲染、逐屏截图走查，原生壳只负责最后打包。UI 质量是这类工具型 App 的全部，能看见才能保证。

- **存储**：`localStorage` 里一个 JSON 文档，配合 Vue `reactive` + `watch(deep)` 自动落盘。不引 SQLite——数据量最多几十套房，用不上。
- **路由**：自研栈式 hash 路由。四个 Tab 是根栈，详情/编辑/对比是压进去的层，安卓返回键先出栈、栈空才退出 App。
- **表单**：`FIELD_GROUPS` 一份字段字典 + `FieldInput.vue` 通用组件，约 55 个字段全部配置驱动。加字段只改字典，不动模板。

---

## 目录

```
src/
  store.js          数据层：维度定义、字段字典、全部计算函数、示例数据
  router.js         栈式 hash 路由
  App.vue           根组件：Tab 切换、安卓返回键
  views/            7 个页面
    HomeView        在住卡片 + 历史房源 + 近 5 月支出
    DetailView      窗镜头图 + 六项条件 + 最弱 3 项 + 费用 + 事实清单
    EditView        4 步表单（基本 → 评分 → 硬件费用 → 周边房东）
    BillsView       月份切换 + 水电双卡 + 支出构成 + 6 月趋势
    InsightsView    偏好条形图 + 结论卡 + 红线清单 + 成本对比
    CompareView     两套房 12 项指标逐行对比
    SettingsView    导出 JSON/CSV、载入示例、清空
  components/
    FieldInput.vue  7 种输入控件（number/text/textarea/date/select/multi/rate）
    Icon.vue        20 个内联 SVG 图标
docs/
  PRD-RoomLog-v0.1.md   完整产品文档（字段字典、算法推导、信息架构）
prototype/
  ui-prototype.html     6 屏设计稿（可用浏览器直接打开）
android/                Capacitor 生成的安卓壳
```

---

## 本地开发

```bash
npm install --legacy-peer-deps
npm run dev          # http://localhost:5173
```

数据存在浏览器 localStorage。想从零开始就点「设置 → 清空数据」；想看看满数据长什么样点「载入示例」（3 套示例房源 + 8 条账单）。

## 打包 APK

**本地打包**（需要 JDK 21 + Android SDK）：

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
# 产物：android/app/build/outputs/apk/debug/app-debug.apk
```

**云端打包**（推荐，本机什么都不用装）：

推送代码到 GitHub 的 `main` / `master` 分支，`.github/workflows/build-apk.yml` 会自动在 Ubuntu runner 上装 Node 20 + JDK 21、构建、同步、编译。约 2 分钟出结果，在仓库的 **Actions** 页面下载 `juzhi-debug-apk` 这个 artifact。

也可以在 Actions 页面手动点 **Run workflow** 触发，不必改代码。

装到手机时需要允许「安装未知来源应用」——因为这是自己签名的包，不是从应用商店来的。

---

## 关于签名（重要，改之前务必读）

### 为什么需要专门处理

Android 判断「这是不是同一个 App 的新版本」，靠的不是包名或版本号，而是**签名证书的指纹**。签名不同 → 系统认为这是另一个应用 → 拒绝覆盖安装（`INSTALL_FAILED_UPDATE_INCOMPATIBLE`），或者必须先卸载，而卸载会清空 localStorage 里的全部记录。

AGP 的默认调试密钥位于 `~/.android/debug.keystore`，**在没有该文件时会随机生成一对新的**。这解释了一个很常见的困惑：

- 在**同一台电脑**上反复构建 → 密钥文件只生成一次、之后一直复用 → 签名不变 → 覆盖安装正常
- 在**GitHub Actions** 上构建 → 每次都是全新虚拟机 → 每次生成不同密钥 → 签名每次都变 → 无法覆盖

所以「以前在本地构建能覆盖、换成云端就不行」不是玄学，是密钥没有持久化。

### 本项目的做法

仓库里提交了一份固定的密钥库：`android/keystore/juzhi.keystore`（PKCS12 格式，RSA 2048，有效期至 2056 年）。`android/app/build.gradle` 里把 `debug` 和 `release` 两种构建类型都指向它：

```gradle
signingConfigs {
    permanent {
        storeFile file("../keystore/juzhi.keystore")
        storeType "PKCS12"
        storePassword "juzhi2026"
        keyAlias "juzhi"
        keyPassword "juzhi2026"
    }
}
buildTypes {
    debug   { signingConfig signingConfigs.permanent }
    release { signingConfig signingConfigs.permanent }
}
```

于是每一次云端构建出来的 APK 签名指纹都相同，新版本可以直接覆盖旧版本，数据保留。

证书指纹（可用于核对某个 APK 是不是本项目构建的）：

```
SHA256: A8:82:50:61:23:02:D7:8A:C4:99:FE:9D:2A:BC:E6:10:E0:D9:1B:55:BD:E8:D9:71:D4:09:83:F9:A0:9E:59:68
```

工作流的「Verify signing certificate」步骤每次都会打印密钥库指纹和 APK 的实际签名指纹，两者一致才算正常。

### 三条纪律

1. **不要删除或替换 `android/keystore/juzhi.keystore`**。一旦换了文件，已装的 App 就再也无法覆盖升级，只能卸载重装，数据全丢。
2. **换了电脑、换了仓库、重建 Android 工程，都要把这个文件带过去**。它比代码更不可替代——代码可以从这个仓库恢复，密钥丢了就永久失去了对已发布版本的更新能力。
3. 建议把 `juzhi.keystore` 和上面那串密码**另行备份一份**（私密网盘、密码管理器附件均可）。

### 一个需要知道的取舍

密钥库是提交在公开仓库里的，密码也就写在 `build.gradle` 里。这意味着任何人都能用它签一个包冒充「居志」。对本项目——自己用、不发布到应用商店、不分发给他人——这个风险可以忽略，换来的是「零依赖、零配置、clone 下来就能构建」的简洁。

但如果你以后要分发给别人或者上架，应该改成：把密钥库转成 base64 存进 GitHub Secrets，工作流里解码使用，仓库里只保留代码。那时候再来改。

---

## 已知取舍

- **数据无备份**：全在 localStorage 里，卸载 App 或清除数据就没了。设置页可以导出 JSON 手动存档，但没有自动备份。
- **不能多设备同步**：这是「本地优先」的代价，也是有意的选择。
- **没有照片**：最初想过给每套房拍几张照，但照片存储、压缩、备份会把复杂度拉高一个量级，首版先不做。

---

## 文档

产品需求的完整推导（55 项字段为什么是这 55 项、算法怎么来的、信息架构怎么划分）见 [`docs/PRD-RoomLog-v0.1.md`](docs/PRD-RoomLog-v0.1.md)。

界面设计稿可以用浏览器直接打开 [`prototype/ui-prototype.html`](prototype/ui-prototype.html) 看，六屏横向平铺。
