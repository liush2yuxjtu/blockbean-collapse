# 方块豆人：塌了就出局 / BlockBean Collapse — PRD v1

**Status:** v0 demo **SHIPPED**: https://blockbean-collapse.vercel.app  
**Repo:** https://github.com/liush2yuxjtu/blockbean-collapse  
**Analytics:** on (Vercel Pro). **Next:** Codex implements Wave 1–3 from this PRD.  
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

用户已批准 **#1–#10 全部做**。明细与验收见 [TRIAGE_WAVES.md](./TRIAGE_WAVES.md)。摘要：

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

---

## 10. Scope — Wave 1–3（相对 v0）

**In scope（Wave 1–2 编码；Wave 3 = Tripo）**

- Physics polish（edge AABB、coyote、jump buffer）  
- Juice VFX / camera punch / warn glow / out feedback  
- Smarter AI + sudden-death 2×2 + result/share screen  
- **InstancedMesh** tiles  
- **Mobile touch** UI  
- **Richer SFX / BGM**  
- **Spectator** after elimination  
- Keep win/lose UI（中文）+ replay  
- Keep modular layout（`game.js` / assets / docs）  

**Explicitly out of scope**

- Netcode / multiplayer servers / accounts / rankings  
- Unity / Unreal  
- Cosmetics shop / battle pass / monetization  
- Minecraft / Fall Guys / 蛋仔 assets, names, or lookalikes  
- Voice chat / full replay editor  

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
- 详细 backlog + 验收条： [TRIAGE_WAVES.md](./TRIAGE_WAVES.md)。  
- 已知 v0 问题清单： [CODEX_HANDOFF.md](./CODEX_HANDOFF.md)。

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

- [ ] Edge AABB + coyote + jump buffer 可测通过  
- [ ] Push VFX + cam punch + warn glow + out feedback  
- [ ] AI 躲预警格 / 尖刺箱 / 会边缘推  
- [ ] Sudden-death 2×2  
- [ ] 结果 / 分享屏  

### Wave 2（open）

- [ ] InstancedMesh 64 tiles（低端机更稳）  
- [ ] Mobile touch 可完成一局  
- [ ] SFX / BGM 塌与推可闻  
- [ ] 出局后可观战切换  

### Wave 3（open）

- [ ] 皮肤 / 地图变体（Tripo；估分后生成；>200 已确认）  

**Role split:** PRD / 部署 docs = 本 bot · Wave 1–2 代码 = Codex / cloud agent · 3D = Tripo · 迭代修 bug = 用户 Codex。
