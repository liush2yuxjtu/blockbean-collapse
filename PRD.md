# 方块豆人：塌了就出局 / BlockBean Collapse — PRD v1

**Status:** v0 demo **SHIPPED**: https://blockbean-collapse.vercel.app  
**Repo:** https://github.com/liush2yuxjtu/blockbean-collapse  
**Analytics:** on (Vercel Pro). **Next:** Codex implements Wave 1–3; Spread + Engineering + Juice also locked (docs-only until coded).  
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

用户已批准 **#1–#10 全部做**，另已锁定 **传播波 A,B,C,F,G**、**工程波 T1–T8**、**Juice J1–J8**。明细与验收见 [TRIAGE_WAVES.md](./TRIAGE_WAVES.md)。摘要：

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

---

## 10. Scope — Wave 1–3 + Spread + Engineering + Juice（相对 v0）

**In scope（Wave 1–2 编码；Wave 3 = Tripo；Spread A/B/C/F/G；Engineering T1–T8；Juice J1–J8）**

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

**Explicitly out of scope**

- Netcode / multiplayer servers / accounts / **global** rankings（本地榜 / 可选匿名榜 OK — Spread F）  
- Unity / Unreal  
- Cosmetics shop / battle pass / monetization / **H gacha skins**  
- Minecraft / Fall Guys / 蛋仔 assets, names, or lookalikes  
- Voice chat / full replay editor / **D GIF replay** / **E daily seed**  

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
- 详细 backlog + 验收条： [TRIAGE_WAVES.md](./TRIAGE_WAVES.md)（含 **Spread**、**Engineering**、**Juice**）。  
- 已知 v0 问题清单： [CODEX_HANDOFF.md](./CODEX_HANDOFF.md)。  
- **优先序：** Wave 1–2 未完成则仍 primary；Spread 可并行或随后；Engineering / Juice 可并行（Juice 优先挂 Wave 1 #2；勿挡玩法验收）。

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

**Role split:** PRD / 部署 docs = 本 bot · Wave 1–2 + Spread + Engineering + Juice 代码 = Codex / cloud agent · 3D = Tripo · 迭代修 bug = 用户 Codex。
