# 方块豆人：塌了就出局 / BlockBean Collapse — PRD v1

**Status:** v0 demo **SHIPPED**: https://blockbean-collapse.vercel.app  
**Repo:** https://github.com/liush2yuxjtu/blockbean-collapse  
**Analytics:** on (Vercel Pro). **Next:** Codex implements Wave 1–3; Spread + Engineering + Juice + Micro + **new locked surfaces** (Onboarding O2–O6 · Retention R2/R3/R4/R6 · Social clip S1/S3–S6 · Balance B1–B6 · Accessibility A2–A6 · Modes D2/D4/D6 · Maps P1–P6 · Audio U1–U4/U6 · Monetization N1/N2/N4/N5 · Spectator C1–C5 · Ops K1–K5) also locked (docs-only until coded).  
**Working title (CN):** 「方块豆人：塌了就出局」  
**Working title (EN):** BlockBean Collapse  
**Target:** Viral CN-community 3D game mashup (Douyin / Bilibili clip-first)  
**Engine:** Browser — Three.js. **No Unity.**  
**Players:** 4–8 (local AI bots OK; no netcode)

---

## 1. One-line pitch（抖音 / B站）

> **「方块塌了就出局！推一把、跳一下，最后一豆称王——15 秒爽到截图。」**

EN mirror: *Voxel floors crumble under you — push, jump, last bean standing. Clip-ready in 15–60s.*

---

## 2. Core loop（单局 15–60 秒）

| Phase | Duration | What happens |
|-------|----------|--------------|
| **Spawn** | ~2s | 4–8 BlockBeans drop onto a floating voxel arena. Countdown 3-2-1. |
| **Survive** | 10–45s | Platforms crack → glowing edges → **collapse**. Players push rivals. Jump gaps. |
| **End** | Instant | Last bean on any remaining solid voxel **wins**. Fall into void = out. Sudden-death: final 2×2 tile shakes harder (Wave 1). |

**Feel target:** Every second something collapses or someone gets yeeted — no dead air for short-video cuts.

---

## 3. Win / lose conditions

| Result | Condition |
|--------|-----------|
| **Win** | Last BlockBean still standing on a non-collapsed voxel when all others are eliminated (or timer hits 60s with ≥1 survivor → highest “push score” tiebreak). |
| **Lose / Out** | Fall below arena Y threshold (void); or stand on a tile that finishes collapsing while you are still on it. |
| **Draw (rare)** | Two beans fall on the same frame → rematch prompt (demo: skip, pick random winner for pacing). |

**Demo bots:** Flock / flee-from-crack AI + push when adjacent. Wave 1 upgrades AI (avoid warn tiles, spikebox, edge pushes).

---

## 4. Map v0 — Collapsing voxel platforms + push

**Single map:** `Arena_Collapse_01`

- **Shape:** Floating island of **8×8 → shrinks** cube tiles (voxel look, ~1m cubes). Outer ring collapses first; inner 2×2 is last stand.
- **Collapse cadence:** Every ~1.5–2.5s a random *eligible* tile enters **Warn (1s glow/shake)** → **Fall (physics drop + despawn)**. Bias: prefer tiles with fewer neighbors (edges die first).
- **Push:** Short-range horizontal impulse. Cooldown ~1.2s. Does **not** deal damage — only displacement. Pushing someone onto a warned tile = high clip value.
- **Hazards:** 1 **hazard prop** (spikebox) that periodically knocks / shoves.
- **Camera:** Soft chase cam behind local player; FOV punch on collapse / push for juice (Wave 1 expands).

**No procedural map gen in v0/v1 waves** — one authored layout + timed collapse script. Map variants = Wave 3 (Tripo).

---

## 5. Controls / 操作

| Input | Action | Wave |
|-------|--------|------|
| **WASD / 方向键** | Move on XZ plane | Shipped |
| **Space** | Jump (single; coyote + buffer — Wave 1 polish) | Shipped / Wave 1 |
| **鼠标左键 / F / E** | Push (forward cone / adjacent rival) | Shipped |
| **Mouse** (optional) | Look / orbit — fixed chase cam OK | Shipped |
| **Mobile touch** | Virtual stick + jump / push buttons | **Wave 2 (in scope)** |
| **Spectate** | After out: switch camera among survivors | **Wave 2 (in scope)** |

---

## 6. Viral clip hooks（短视频钩子）

1. **塌了就出局** — Slow-mo tile drop under feet + scream emoji overlay.  
2. **推下悬崖** — Push at edge → rival falls into void; reverse angle replay.  
3. **最后一豆** — 2×2 final platform, two beans circling, one push decides.  
4. **连锁塌方** — Edge ring vanishes in a wave; crowd of bots scramble.  
5. **差一点** — Jump lands on tile that warns mid-air → comedy fail.

Hook rule: **first 3 seconds must show collapse or push-off** so Douyin / Bilibili retention sticks.

---

## 7. Asset list for Tripo（v0 — 4 assets · SHIPPED）

| # | Asset ID | Description | Tripo use | Status |
|---|----------|-------------|-----------|--------|
| 1 | `hero_blockbean_tpose` | Original **方块豆人** hero — cube body + cute bean limbs, T-pose, no IP refs | Primary playable mesh | ✅ GLB |
| 2 | `rival_blockbean_tint` | Same silhouette, **rival color tint** (coral / mint) for bots | Instance recolor / bake | ✅ GLB |
| 3 | `voxel_tile_crumble` | Single crumbling voxel platform tile | Arena tile + collapse VFX | ✅ GLB |
| 4 | `hazard_prop_spikebox` | Spiked / warning cube (original, not Minecraft IP) | Periodic knock prop | ✅ GLB |

**Credit budget (Wave 3):** Estimate Tripo points before generating more skins/maps. Escalate / confirm with user if estimate **>200**.

**Gallery path:** `/workspace/gallery/tripo/blockbean-collapse/`  
**Canonical repo:** https://github.com/liush2yuxjtu/blockbean-collapse

---

## 8. 当前状态 / Shipped

- [x] PRD（本文件 v1）+ ASSET_BRIEF  
- [x] Concept art / keyart  
- [x] Tripo 4 GLBs（hero / rival / tile / spikebox）  
- [x] Playable browser demo（Three.js，15–60s round）  
- [x] Vercel production：https://blockbean-collapse.vercel.app  
- [x] GitHub public：https://github.com/liush2yuxjtu/blockbean-collapse  
- [x] Web Analytics + custom events（Vercel Insights / `va`）

---

## 9. 下一波分诊 / Next waves

用户已批准 **#1–#10 全部做**，另已锁定 **传播波 A,B,C,F,G**、**工程波 T1–T8**、**Juice J1–J8**、**微调波 M1–M8**，以及 **2026-10-17 新锁表面**：Onboarding **O2–O6** · Retention **R2/R3/R4/R6** · Social clip **S1/S3–S6** · Balance **B1–B6** · Accessibility **A2–A6** · Modes **D2/D4/D6** · Maps **P1–P6** · Audio **U1–U4/U6** · Monetization **N1/N2/N4/N5** · Spectator **C1–C5** · Ops **K1–K5**。明细与验收见 [TRIAGE_WAVES.md](./TRIAGE_WAVES.md)。摘要：

### Wave 1 — 手感 + 病毒镜头（先做）

1. **物理：** 边缘 AABB 站立/掉落修正；coyote time；跳跃缓冲  
2. **Juice：** 推人粒子 VFX、镜头冲击、塌方预警更亮/更抖、出局反馈  
3. **更聪明 AI：** 躲预警格、躲尖刺箱、边缘推人  
4. **Sudden-death：** 最后 2×2 加剧抖动 / 加速塌陷  
5. **结果 / 分享屏：** 胜负、推人分、可复制文案 + 短链  

### Wave 2 — 触达 + 打磨

6. **InstancedMesh** 64 tile 性能  
7. **移动端触控**  
8. **SFX / BGM**（塌、推、胜负）  
10. **出局后观战**（可选简易回放）  

### Wave 3 — 内容

9. **更多皮肤 / 地图变体**（Tripo；生成前估积分；>200 须确认）  


### Wave 4 — 传播波 / Spread wave（用户已选 A,B,C,F,G）

用户勾选 **A / B / C / F / G**（**未选** D GIF 回放、E 每日 seed、H 扭蛋皮肤）。明细与验收见 [TRIAGE_WAVES.md](./TRIAGE_WAVES.md) Spread 表。摘要：

| ID | Item | Codex acceptance（摘要） |
|----|------|--------------------------|
| **A** | Opening 3s hook | 点 Start 前自动播放塌/推短 clip（可静音）；可跳过；3s 内必须出现 collapse 或 push |
| **B** | Shorter harsher rounds | 默认局时 **25–35s**；塌格更密；仍能决出最后一豆；Feel 无长时间死气 |
| **C** | Meme result copy | 结束页随机 roast 文案（CN）；一键复制适配小红书 / 剪映；含 play URL |
| **F** | Light leaderboard | 本地最佳连胜 / 推人分（localStorage）；可选匿名榜 OK；**无账号** |
| **G** | Local 2P same screen | 分键位同屏双人（如 WASD+推 vs 方向键+推）；**无 netcode** |

**Explicitly NOT in this wave:** D GIF replay · E daily seed · H gacha skins.

**Scheduling:** Wave 1–2 仍优先若未完成；Spread 可与 Wave 1–2 **并行**或紧随其后。

### 工程波 / Engineering wave（用户已选 T1–T8 全做）

用户勾选 **T1–T8 全部**。明细与验收见 [TRIAGE_WAVES.md](./TRIAGE_WAVES.md) Engineering 表。摘要：

| ID | Item | Codex acceptance（摘要） |
|----|------|--------------------------|
| **T1** | Split `game.js` modules | 拆成 arena / beans / input / ui（或等价）；行为与 v0 对齐；无 build 或保持静态可跑 |
| **T2** | Playwright regression CI | CI：load → start → fall/out → result；PR/`main` 可跑；失败阻断合入 |
| **T3** | Enrich analytics events | 时长、`push_count` 等；保留现有 Insights / `va`；无 PII |
| **T4** | Error boundaries | WebGL 失败 / GLB 404 有可读 fallback UI；方块替代仍可用 |
| **T5** | Asset strategy（不压 GLB） | 禁止压缩/重导出 GLB；critical preload + lazy rival（或等价） |
| **T6** | Pause + reduce motion | Esc 暂停；可关 shake / cam punch（reduce motion） |
| **T7** | i18n CN/EN HUD | HUD / 结果文案 CN↔EN 切换；默认 CN |
| **T8** | LICENSE + CONTRIBUTING | 根目录 LICENSE + CONTRIBUTING；与公开 repo 一致 |

**Scheduling:** 可与 Wave 1–2 / Spread **并行**（尤其 T1/T2/T3/T8）；勿阻塞手感/传播玩法验收。

### Juice 清单 / Juice checklist（用户已选 J1–J8 全做；含 J4+J5）

用户勾选 **J1–J8 全部**（**J4 与 J5 均做**）。与 Wave 1 #2 Juice 对齐并细化。明细与验收见 [TRIAGE_WAVES.md](./TRIAGE_WAVES.md) Juice 表。

| ID | Item | Codex acceptance（摘要） |
|----|------|--------------------------|
| **J1** | Push impact | 成功推：FOV punch + 轻 screen shake + rival 闪一下；reduce-motion 时可关 shake |
| **J2** | Collapse warn layer | 预警格：边缘 glow 脉冲 + crack flash；tick SFX（可 mute） |
| **J3** | Collapse moment | 塌落：fall trail + dust particles + 低沉 rumble（可 mute） |
| **J4** | Out sequence | 出局：短慢动作 + cam pullback + 「出局了！」pop |
| **J5** | Jump land | 落地：squash + land dust（可感知但不拖沓） |
| **J6** | Multi-push float text | 连推浮字：「再推！」「双推」等；不挡操作 |
| **J7** | Final 2×2 heartbeat | 与 sudden-death 联动：红 tint、更快心跳节奏、边缘 flash |
| **J8** | Win celebration | 胜利：confetti 或 bean hop + win sting |

**Scheduling:** 优先随 Wave 1 #2；可与 Spread A/C 视觉钩子叠加。尊重 T6 reduce motion。

### 微调波 / Micro tweaks（用户已选 M1–M8 全做）

用户勾选 **M1–M8 全部**。明细与验收见 [TRIAGE_WAVES.md](./TRIAGE_WAVES.md) Micro tweaks 表。摘要：

| ID | Item | Codex acceptance（摘要） |
|----|------|--------------------------|
| **M1** | Push cooldown feel | 推：短 windup → 清晰 recovery；cooldown 可读（UI 或手感）；不拖沓 |
| **M2** | Camera damping / follow lag | 追逐相机有阻尼 / follow lag；既跟得上又不抖；reduce-motion 时可更紧 |
| **M3** | Collapse pace curve | 塌格节奏：先慢后急（slow then rush）；仍能决出最后一豆；无长时间死气 |
| **M4** | Bot count / spawn spread | 可调 bot 数与 spawn 分散；开局不挤成一团；4–8 仍可玩 |
| **M5** | HUD size & contrast | HUD 字号 / 对比度在手机上可读；不挡操作区 |
| **M6** | Start gated until load ready | Start 在资源就绪前禁用/灰显；就绪后可点；有加载反馈 |
| **M7** | Emphasize R on result | 结果页醒目提示 **R** 重开；键盘 R 仍可用 |
| **M8** | Mute preference persisted | 静音偏好写入 localStorage；刷新后保持 |

**Scheduling:** 可与 Wave 1–2 / Juice / Engineering **并行**；小改优先穿插，勿挡主玩法验收。

### 新手引导 / Onboarding（用户已选 O2–O6；未选 O1）

用户勾选 **O2, O3, O4, O5, O6**（**未选** O1）。明细与验收见 [TRIAGE_WAVES.md](./TRIAGE_WAVES.md) Onboarding 表。摘要：

| ID | Item | Codex acceptance（摘要） |
|----|------|--------------------------|
| **O2** | Practice island / safe first round | 首局或练习岛无致死塌/推压力（或大幅减弱）；可正常学走/跳/推；结束后可进正式局 |
| **O3** | Start gated until load ready + visible progress | Start 在资源就绪前禁用；可见进度（条/%/文案）；就绪后可点；与 M6 对齐不冲突 |
| **O4** | Contextual tip on first out / first win (once) | 首次出局、首次胜利各出一次情境 tip（CN）；之后不再打扰 |
| **O5** | Skip + never-show-again persisted | Tip/引导可 Skip；「不再显示」写入 localStorage；刷新后仍跳过 |
| **O6** | Ghost demo bean for 5s if idle on title | 标题页闲置 ~5s 出现 ghost demo 豆演示走/推/塌；可打断；不挡 Start |

**Explicitly NOT in this lock:** O1.

**Scheduling:** 可与 Wave 1–2 **并行**；勿挡 Wave 1–2 手感验收。

### 留存 / Retention（用户已选 R2, R3, R4, R6；未选 R1, R5）

用户勾选 **R2, R3, R4, R6**（**未选** R1, R5）。明细与验收见 [TRIAGE_WAVES.md](./TRIAGE_WAVES.md) Retention 表。摘要：

| ID | Item | Codex acceptance（摘要） |
|----|------|--------------------------|
| **R2** | Win / play streak counter (localStorage) | 显示连胜 / 连玩计数；localStorage 持久；败局重置连胜（连玩规则文档化） |
| **R3** | Soft return reward copy after N days away | 离开 ≥N 天后回访显示柔和回归文案（无付费墙）；N 可配；仅文案/轻反馈 |
| **R4** | Personal best board (pushes, survival time) | 本地个人最佳：推人数、存活时长等；结果页可读；无账号 |
| **R6** | Yesterday vs today one-line compare on result | 结果页一行「昨日 vs 今日」对比（局数/推分等）；无数据时温和空态 |

**Explicitly NOT in this lock:** R1 · R5.

**Scheduling:** 可与 Spread F / 结果页 **并行**；勿挡 Wave 1–2 手感。

### 社交切片 / Social clip（用户已选 S1, S3–S6；未选 S2）

用户勾选 **S1, S3, S4, S5, S6**（**未选** S2）。明细与验收见 [TRIAGE_WAVES.md](./TRIAGE_WAVES.md) Social clip 表。摘要：

| ID | Item | Codex acceptance（摘要） |
|----|------|--------------------------|
| **S1** | Result share card (canvas/PNG) | 结果可导出 canvas/PNG 分享卡：分数 + hook 文案；可下载/复制；含 play 暗示 |
| **S3** | Auto last-10s buffer for out / win | 出局/胜利时客户端保留近 ~10s 缓冲（仅本地）；可触发回看/导出钩子；无服务端 |
| **S4** | Spectate watermark / handle field | 观战/切片带水印或可填 handle 字段；默认不挡操作；可关 |
| **S5** | Opening 3s hook freeze-frame | 录屏/开场用 3s hook 定格帧（塌或推）；与 Spread A 可叠加不冲突 |
| **S6** | Defeat / clutch title variants | 分享文案有失败 / clutch 标题变体；随机或情境选；CN 可读 |

**Explicitly NOT in this lock:** S2.

**Scheduling:** 可与 Spread A/C、结果页 **并行**；勿挡 Wave 1–2 手感。

### 数值平衡 / Balance（用户已选 B1–B6 全做）

用户勾选 **B1–B6 全部**。明细与验收见 [TRIAGE_WAVES.md](./TRIAGE_WAVES.md) Balance 表。摘要：

| ID | Item | Codex acceptance（摘要） |
|----|------|--------------------------|
| **B1** | Push force + cooldown table | easy / default / spicy 三档推力+冷却表；可切换或调试；手感可感知差异 |
| **B2** | Collapse pace curve presets | 塌格节奏预设（如 slow-rush / steady）；可切换；与 M3 对齐 |
| **B3** | AI difficulty tiers | AI 难度分档（躲预警/推边缘等）；可切换；4–8 局仍可玩 |
| **B4** | Bot count + spawn spread knobs | bot 数与 spawn 分散旋钮；开局不挤；与 M4 对齐 |
| **B5** | Round length target band | 目标局长区间可配（如 25–35s / 15–60s）；与 Spread B 不冲突 |
| **B6** | Exposed BALANCE constants block | 集中 `BALANCE`（或等价）常量块；改一处可调上述旋钮；有简短注释 |

**Scheduling:** 可与 Wave 1 / Micro **并行**；勿挡手感主验收。

### 无障碍 / Accessibility（用户已选 A2–A6；未选 A1）

用户勾选 **A2, A3, A4, A5, A6**（**未选** A1）。明细与验收见 [TRIAGE_WAVES.md](./TRIAGE_WAVES.md) Accessibility 表。摘要：

| ID | Item | Codex acceptance（摘要） |
|----|------|--------------------------|
| **A2** | Colorblind-safe warn / out / win palette | 预警/出局/胜利色对色盲友好（不只靠红绿）；对照可测 |
| **A3** | Captions / icon for critical SFX | 关键 SFX（塌预警、出局、胜利）有字幕或图标；可随 mute 仍可读 |
| **A4** | Remappable keys + touch hit-target size | 键位可重映射；触控热区足够大（移动可读）；桌面默认不受损 |
| **A5** | HUD scale / contrast presets | HUD 缩放/对比度预设；与 M5 对齐；手机可读 |
| **A6** | Pause (Esc) + hold-to-confirm quit | Esc 暂停；退出需长按/二次确认；与 T6 对齐不冲突 |

**Explicitly NOT in this lock:** A1.

**Scheduling:** 可与 Engineering T6 / Micro M5 **并行**；勿挡 Wave 1–2 手感。

### 模式 / Modes（用户已选 D2, D4, D6；未选 D1, D3, D5）

用户勾选 **D2, D4, D6**（**未选** D1, D3, D5）。明细与验收见 [TRIAGE_WAVES.md](./TRIAGE_WAVES.md) Modes 表。摘要：

| ID | Item | Codex acceptance（摘要） |
|----|------|--------------------------|
| **D2** | No-push — survival only | 无推模式：仅走跳求生；推输入无效或隐藏；仍能决出最后一豆 |
| **D4** | Hazard rain — periodic spike drops | 周期性尖刺/危险物落下；可躲；不永久堵死核心岛 |
| **D6** | Ghost trail — rivals leave short path ghosts | 对手留下短路径残影；可辨方向；残影不挡物理 |

**Explicitly NOT in this lock:** D1 · D3 · D5.

**Scheduling:** 可在 Wave 1–2 手感稳后再并行；勿挡主循环验收。

### 地图 / Maps（用户已选 P1–P6 全做）

用户勾选 **P1–P6 全部**。明细与验收见 [TRIAGE_WAVES.md](./TRIAGE_WAVES.md) Maps 表。摘要：

| ID | Item | Codex acceptance（摘要） |
|----|------|--------------------------|
| **P1** | Layout pool of 3 authored grids | ≥3 套作者网格布局可轮换/抽取；塌规则仍成立 |
| **P2** | Theme pack A — grass / dirt | 草地/泥土主题贴图或材质包可套用；不压既有 GLB |
| **P3** | Theme pack B — ice / slippery | 冰面/打滑主题；移动有可感知滑动；仍可控 |
| **P4** | Theme pack C — night neon | 夜霓虹主题；预警/HUD 仍可读 |
| **P5** | Center pit / ring variants | 中心坑 / 环状变体布局；仍能决出最后一豆 |
| **P6** | Map pick screen (local; random default) | 本地选图屏；默认随机；无网也可 |

**Note:** Tripo 主题 mesh **须先估积分再生成**（>200 须用户确认）。Codex 只接线，不作者 3D。

**Scheduling:** 与 Wave 3 / Tripo 对齐；布局/选图可先代码；勿挡 Wave 1–2 手感。

### 音频 / Audio（用户已选 U1–U4, U6；未选 U5）

用户勾选 **U1, U2, U3, U4, U6**（**未选** U5）。明细与验收见 [TRIAGE_WAVES.md](./TRIAGE_WAVES.md) Audio 表。摘要：

| ID | Item | Codex acceptance（摘要） |
|----|------|--------------------------|
| **U1** | Layered SFX bus | SFX 分层总线（推/塌/UI 等）；互不糊死；可 mute |
| **U2** | BGM bed with intensity duck on warn | BGM 底床；预警时强度 duck；可关 |
| **U3** | Mute / volume persisted | 静音/音量写入 localStorage；与 M8 对齐 |
| **U4** | Out / win sting one-shots | 出局/胜利独立 sting one-shot；可 mute |
| **U6** | Spatial-lite pan on left/right pushes | 左/右推有轻量 pan；不明显伤单声道 |

**Explicitly NOT in this lock:** U5.

**Scheduling:** 可与 Wave 2 #8 / Juice **并行**；勿挡手感。

### 变现 / Monetization（用户已选 N1, N2, N4, N5；未选 N3）

用户勾选 **N1, N2, N4, N5**（**未选** N3）。**永不锁核心循环**（推/跳/塌/胜负不可 IAP 墙）。明细与验收见 [TRIAGE_WAVES.md](./TRIAGE_WAVES.md) Monetization 表。摘要：

| ID | Item | Codex acceptance（摘要） |
|----|------|--------------------------|
| **N1** | Cosmetic-only skins catalog | 仅外观皮肤目录；不影响手感数值 |
| **N2** | Free starter + unlock-by-streak skins | 免费起始皮 + 连胜解锁皮；无付费才能玩 |
| **N4** | Clear ads-never / no-IAP-in-v1 scope | 文档与 UI 范围写明：v1 **无广告、无 IAP** |
| **N5** | Skin preview on title without purchase flow | 标题页可预览皮肤；无购买流程/结账 |

**Explicitly NOT in this lock:** N3.

**Scheduling:** 目录/预览可并行；3D 皮 = Tripo；勿挡 Wave 1–2。

### 观战 / Spectator（用户已选 C1–C5 全做）

用户勾选 **C1–C5 全部**。明细与验收见 [TRIAGE_WAVES.md](./TRIAGE_WAVES.md) Spectator 表。摘要：

| ID | Item | Codex acceptance（摘要） |
|----|------|--------------------------|
| **C1** | After out: cycle survivors | 出局后可循环切换存活豆；局继续至真正胜者 |
| **C2** | Spec HUD: alive count + next collapse tip | 观战 HUD：存活数 + 下一塌提示；不挡视线 |
| **C3** | Soft follow cam + optional free look | 柔和跟随相机；可选自由看；默认不晕 |
| **C4** | Caption strip for big moments | 大场面（连推/终局）字幕条；可关 |
| **C5** | Return-to-lobby without killing round view | 回大厅不强制掐断观战画面（或明确确认）；局逻辑不因误触结束错乱 |

**Scheduling:** 与 Wave 2 #10 **对齐/扩展**；可并行；勿挡手感。

### 运维 / Ops（用户已选 K1–K5 全做）

用户勾选 **K1–K5 全部**。明细与验收见 [TRIAGE_WAVES.md](./TRIAGE_WAVES.md) Ops 表。摘要：

| ID | Item | Codex acceptance（摘要） |
|----|------|--------------------------|
| **K1** | Version / build banner | 可见版本/build 横幅或角标（dev/prod 可读） |
| **K2** | Remote JSON flags with local fallback | 远程 JSON 开关；失败回落本地默认；不堵开局 |
| **K3** | Soft maintenance message screen | 软维护提示屏（文案+可返回）；非硬杀进程 |
| **K4** | Client error beacon analytics doc link | 客户端错误 beacon + 分析文档链接；无 PII |
| **K5** | Kill-switch to force box fallback assets | 开关强制方块 fallback（跳过 GLB）；仍可玩一局 |

**Scheduling:** 可与 Engineering T3/T4 **并行**；勿挡 Wave 1–2 手感。

---

## 10. Scope — Wave 1–3 + Spread + Engineering + Juice + Micro + Game surfaces（相对 v0）

**In scope（Wave 1–2 编码；Wave 3 = Tripo；Spread A/B/C/F/G；Engineering T1–T8；Juice J1–J8；Micro tweaks M1–M8；Onboarding O2–O6；Retention R2/R3/R4/R6；Social clip S1/S3–S6；Balance B1–B6；Accessibility A2–A6；Modes D2/D4/D6；Maps P1–P6；Audio U1–U4/U6；Monetization N1/N2/N4/N5；Spectator C1–C5；Ops K1–K5）**

- Physics polish（edge AABB、coyote、jump buffer）  
- Juice VFX / camera punch / warn glow / out feedback → **J1–J8** checklist  
- Smarter AI + sudden-death 2×2 + result/share screen  
- **InstancedMesh** tiles  
- **Mobile touch** UI  
- **Richer SFX / BGM**  
- **Spectator** after elimination  
- Keep win/lose UI（中文）+ replay  
- Keep modular layout（`game.js` / assets / docs） → **T1** modules  
- **Spread:** opening hook · 25–35s harsh rounds · meme copy · local streak board · local 2P  
- **Engineering:** Playwright CI · richer analytics · error UI · asset lazy/preload · pause/a11y · i18n · LICENSE  
- **Micro tweaks:** push cooldown feel · cam damping · collapse pace curve · bot spawn · HUD mobile · Start gate · R on result · mute persist  
- **Onboarding:** practice island · Start gate+progress · first out/win tips · skip/never-show · ghost demo  
- **Retention:** streak counter · soft return copy · personal best · yesterday vs today  
- **Social clip:** share card PNG · last-10s buffer · spectate watermark · 3s hook freeze · defeat/clutch titles  
- **Balance:** push table · pace presets · AI tiers · bot/spawn knobs · round band · BALANCE constants  
- **Accessibility:** colorblind palette · SFX captions · remap+hit targets · HUD presets · pause+hold quit  
- **Modes:** no-push · hazard rain · ghost trail  
- **Maps:** 3 layouts · theme A/B/C · pit/ring · map pick（Tripo themes：估分后再生成）  
- **Audio:** SFX bus · BGM duck · mute persist · out/win stings · spatial-lite pan  
- **Monetization:** cosmetic catalog · streak unlock · ads-never/no-IAP v1 · title preview（**永不锁核心循环**）  
- **Spectator:** cycle survivors · spec HUD · soft follow · caption strip · return-to-lobby  
- **Ops:** version banner · remote flags · soft maintenance · error beacon · box-fallback kill-switch  

**Explicitly out of scope**

- Netcode / multiplayer servers / accounts / **global** rankings（本地榜 / 可选匿名榜 OK — Spread F）  
- Unity / Unreal  
- Battle pass / paywall on core loop / **H gacha skins** / **N3**（未锁）；v1 **无广告、无 IAP**（见 N4）— 仅cosmetic目录 N1/N2/N5  
- Minecraft / Fall Guys / 蛋仔 assets, names, or lookalikes  
- Voice chat / full replay editor / **D GIF replay** / **E daily seed**  
- **This lock 未选 IDs（明确不做）：** O1 · R1 · R5 · S2 · A1 · D1 · D3 · D5 · U5 · N3  

---

## 11. IP / originality notes

- Characters are **original「方块豆人」** cube-bean avatars only.  
- **NO** Creeper, **NO** Fall Guys bean silhouette IP, **NO** 蛋仔 / 网易 trademarks, logos, or distinctive costume copies.  
- World is **generic voxel cubes** — not Minecraft block atlas, not Mojang branding.  
- Hazard prop must read as original “warning cube,” not TNT / creeper face.  
- Marketing copy uses our titles only; avoid “Fall Guys-like” / “蛋仔派对” in store text if publishing publicly (internal pitch may compare genre).

---

## 12. Codex 执行说明 / Codex execution notes

- **只在本仓库工作**（https://github.com/liush2yuxjtu/blockbean-collapse）。改完开 PR → merge `main`（Vercel 自动部署）。  
- **不要压缩 / 重导出 GLB**（保留现有 Tripo 产出体积与材质）。  
- **保留** `/_vercel/insights` script 与现有 `va` custom events；新流程（结果页、观战、触控）可加事件。  
- 遗留 bug 用 [CODEX_HANDOFF.md](./CODEX_HANDOFF.md) 同款格式交接（已知问题 + repro + acceptance）。  
- **3D 皮肤 / 新地图 mesh = Tripo bot 后续**，不是 Codex 职责。Codex 只做代码与 UI 接线。  
- 详细 backlog + 验收条： [TRIAGE_WAVES.md](./TRIAGE_WAVES.md)（含 **Spread**、**Engineering**、**Juice**、**Micro tweaks**、以及 Onboarding / Retention / Social clip / Balance / Accessibility / Modes / Maps / Audio / Monetization / Spectator / Ops）。  
- 已知 v0 问题清单： [CODEX_HANDOFF.md](./CODEX_HANDOFF.md)。  
- **优先序：** Wave 1–2 未完成则仍 primary；Spread 可并行或随后；Engineering / Juice / Micro / 新锁表面 可并行（Juice 优先挂 Wave 1 #2；Micro 与 surface 小改可穿插；**勿挡 Wave 1–2 手感验收**）。

---

## 13. Success criteria / 成功标准

### Shipped（v0）

- [x] PRD + ASSET_BRIEF  
- [x] Concept art  
- [x] Tripo 4 GLBs  
- [x] Browser demo playable 15–60s  
- [x] Vercel prod + GitHub public  
- [x] Web Analytics + custom events  

### Wave 1（open）

- [x] Edge AABB + coyote + jump buffer 可测通过  
- [x] Push VFX + cam punch + warn glow + out feedback  
- [x] AI 躲预警格 / 尖刺箱 / 会边缘推  
- [x] Sudden-death 2×2  
- [x] 结果 / 分享屏  

### Wave 2（open）

- [x] InstancedMesh 64 tiles（低端机更稳）  
- [x] Mobile touch 可完成一局  
- [x] SFX / BGM 塌与推可闻  
- [x] 出局后可观战切换  

### Wave 3（open）

- [ ] 皮肤 / 地图变体（Tripo；估分后生成；>200 已确认）  


### Spread wave（open — A,B,C,F,G）

- [x] A Opening 3s hook clip before Start  
- [x] B Rounds 25–35s denser collapses  
- [x] C Meme roast copy + one-tap 小红书/剪映  
- [x] F Local best streak / push score（optional anon board）  
- [x] G Local 2P same-screen split keyboard  

**Not this wave:** D · E · H

### Engineering wave（open — T1–T8）

- [x] T1 Modules split  
- [x] T2 Playwright CI  
- [x] T3 Enrich analytics  
- [x] T4 Error boundaries  
- [x] T5 Asset strategy（no GLB compress）  
- [x] T6 Pause + reduce motion  
- [x] T7 i18n CN/EN  
- [x] T8 LICENSE + CONTRIBUTING  

### Juice checklist（open — J1–J8）

- [x] J1 Push impact  
- [x] J2 Collapse warn layer  
- [x] J3 Collapse moment  
- [x] J4 Out sequence  
- [x] J5 Jump land  
- [x] J6 Multi-push float text  
- [x] J7 Final 2×2 heartbeat  
- [x] J8 Win celebration  

### Micro tweaks（open — M1–M8）

- [x] M1 Push cooldown feel  
- [x] M2 Camera damping / follow lag  
- [x] M3 Collapse pace curve  
- [x] M4 Bot count / spawn spread  
- [x] M5 HUD size & contrast  
- [x] M6 Start gated until load ready  
- [x] M7 Emphasize R on result  
- [x] M8 Mute preference persisted  

### Onboarding（open — O2–O6；NOT O1）

- [x] O2 Practice island / safe first round  
- [x] O3 Start gated until load ready + visible progress  
- [x] O4 Contextual tip on first out / first win (once)  
- [ ] O5 Skip + never-show-again persisted  
- [ ] O6 Ghost demo bean for 5s if idle on title  

**Not this lock:** O1

### Retention（open — R2, R3, R4, R6；NOT R1, R5）

- [ ] R2 Win / play streak counter  
- [ ] R3 Soft return reward copy  
- [ ] R4 Personal best board  
- [ ] R6 Yesterday vs today compare  

**Not this lock:** R1 · R5

### Social clip（open — S1, S3–S6；NOT S2）

- [ ] S1 Result share card  
- [ ] S3 Auto last-10s buffer  
- [ ] S4 Spectate watermark / handle  
- [ ] S5 Opening 3s hook freeze-frame  
- [ ] S6 Defeat / clutch title variants  

**Not this lock:** S2

### Balance（open — B1–B6）

- [ ] B1 Push force + cooldown table  
- [ ] B2 Collapse pace curve presets  
- [ ] B3 AI difficulty tiers  
- [ ] B4 Bot count + spawn spread knobs  
- [ ] B5 Round length target band  
- [ ] B6 Exposed BALANCE constants  

### Accessibility（open — A2–A6；NOT A1）

- [ ] A2 Colorblind-safe palette  
- [ ] A3 Captions / icon for critical SFX  
- [ ] A4 Remappable keys + touch hit-targets  
- [ ] A5 HUD scale / contrast presets  
- [ ] A6 Pause + hold-to-confirm quit  

**Not this lock:** A1

### Modes（open — D2, D4, D6；NOT D1, D3, D5）

- [ ] D2 No-push  
- [ ] D4 Hazard rain  
- [ ] D6 Ghost trail  

**Not this lock:** D1 · D3 · D5

### Maps（open — P1–P6）

- [ ] P1 Layout pool of 3 authored grids  
- [ ] P2 Theme pack A — grass / dirt  
- [ ] P3 Theme pack B — ice / slippery  
- [ ] P4 Theme pack C — night neon  
- [ ] P5 Center pit / ring variants  
- [ ] P6 Map pick screen  

### Audio（open — U1–U4, U6；NOT U5）

- [ ] U1 Layered SFX bus  
- [ ] U2 BGM bed + intensity duck  
- [ ] U3 Mute / volume persisted  
- [ ] U4 Out / win sting one-shots  
- [ ] U6 Spatial-lite pan  

**Not this lock:** U5

### Monetization（open — N1, N2, N4, N5；NOT N3；never gate core loop）

- [ ] N1 Cosmetic-only skins catalog  
- [ ] N2 Free starter + unlock-by-streak  
- [ ] N4 Ads-never / no-IAP-in-v1 scope line  
- [ ] N5 Skin preview on title  

**Not this lock:** N3

### Spectator（open — C1–C5）

- [ ] C1 Cycle survivors after out  
- [ ] C2 Spec HUD  
- [ ] C3 Soft follow cam + free look  
- [ ] C4 Caption strip  
- [ ] C5 Return-to-lobby without killing round view  

### Ops（open — K1–K5）

- [ ] K1 Version / build banner  
- [ ] K2 Remote JSON flags + local fallback  
- [ ] K3 Soft maintenance message  
- [ ] K4 Client error beacon + doc link  
- [ ] K5 Kill-switch box fallback assets  

**Role split:** PRD / 部署 docs = 本 bot · Wave 1–2 + Spread + Engineering + Juice + Micro + Game surfaces 代码 = Codex / cloud agent · 3D = Tripo · 迭代修 bug = 用户 Codex。
