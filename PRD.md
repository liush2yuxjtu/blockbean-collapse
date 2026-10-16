# 方块豆人：塌了就出局 / BlockBean Collapse — PRD v0

**Status:** Decision locked — Minecraft × Fall Guys / 蛋仔 style = **voxel collapse elimination race**  
**Working title (CN):** 「方块豆人：塌了就出局」  
**Working title (EN):** BlockBean Collapse  
**Target:** Viral CN-community 3D game mashup (Douyin / Bilibili clip-first)  
**Engine (v0):** Browser — Three.js (preferred) or PlayCanvas-lite. **No Unity.**  
**Players:** 4–8 (local AI bots OK for demo)

---

## 1. One-line pitch（抖音 / B站）

> **「方块塌了就出局！推一把、跳一下，最后一豆称王——15 秒爽到截图。」**

EN mirror: *Voxel floors crumble under you — push, jump, last bean standing. Clip-ready in 15–60s.*

---

## 2. Core loop（单局 15–60 秒）

| Phase | Duration | What happens |
|-------|----------|--------------|
| **Spawn** | ~2s | 4–8 BlockBeans drop onto a floating voxel arena. Countdown 3-2-1. |
| **Survive** | 10–45s | Platforms crack → glowing edges → **collapse**. Players push rivals (E). Jump gaps (Space). |
| **End** | Instant | Last bean on any remaining solid voxel **wins**. Fall into void = out. Optional sudden-death: final 2×2 tile shakes harder. |

**Feel target:** Every second something collapses or someone gets yeeted — no dead air for short-video cuts.

---

## 3. Win / lose conditions

| Result | Condition |
|--------|-----------|
| **Win** | Last BlockBean still standing on a non-collapsed voxel when all others are eliminated (or timer hits 60s with ≥1 survivor → highest “push score” tiebreak). |
| **Lose / Out** | Fall below arena Y threshold (void); or stand on a tile that finishes collapsing while you are still on it. |
| **Draw (rare)** | Two beans fall on the same frame → rematch prompt (demo: skip, pick random winner for pacing). |

**Demo bots:** Simple flock / flee-from-crack AI + random push when adjacent — enough for 4–8 filled lobbies without netcode.

---

## 4. Map v0 — Collapsing voxel platforms + push

**Single map:** `Arena_Collapse_01`

- **Shape:** Floating island of **8×8 → shrinks** cube tiles (voxel look, ~1m cubes). Outer ring collapses first; inner 2×2 is last stand.
- **Collapse cadence:** Every ~1.5–2.5s a random *eligible* tile enters **Warn (1s glow/shake)** → **Fall (physics drop + despawn)**. Bias: prefer tiles with fewer neighbors (edges die first).
- **Push:** Short-range horizontal impulse (E). Cooldown ~1.2s. Does **not** deal damage — only displacement. Pushing someone onto a warned tile = high clip value.
- **Hazards (optional prop):** 1–2 **hazard props** (see assets) that periodically knock tiles or apply a shove pulse — keep to 1 type in v0.
- **Camera:** Soft chase cam behind local player; FOV punch on collapse / push for juice.

**No procedural map gen in v0** — one authored layout + timed collapse script.

---

## 5. Controls

| Input | Action |
|-------|--------|
| **WASD** | Move on XZ plane |
| **Space** | Jump (single jump; short coyote + buffer for fairness) |
| **E** | Push (forward cone / adjacent rival) |
| **Mouse** (optional) | Look / orbit — if omitted, fixed chase cam is OK for demo |

Mobile later: virtual stick + jump / push buttons — **out of v0.**

---

## 6. Viral clip hooks（短视频钩子）

1. **塌了就出局** — Slow-mo tile drop under feet + scream emoji overlay.  
2. **推下悬崖** — E push at edge → rival falls into void; reverse angle replay.  
3. **最后一豆** — 2×2 final platform, two beans circling, one push decides.  
4. **连锁塌方** — Edge ring vanishes in a wave; crowd of bots scramble.  
5. **差一点** — Jump lands on tile that warns mid-air → comedy fail.

Hook rule: **first 3 seconds must show collapse or push-off** so Douyin / Bilibili retention sticks.

---

## 7. Asset list for Tripo（v0 — 4 assets）

| # | Asset ID | Description | Tripo use |
|---|----------|-------------|-----------|
| 1 | `hero_blockbean_tpose` | Original **方块豆人** hero — cube body + cute bean limbs, T-pose, no IP refs | Primary playable mesh |
| 2 | `rival_blockbean_tint` | Same silhouette, **rival color tint** (e.g. coral / mint) for bots / P2 | Instance recolor or separate bake |
| 3 | `voxel_tile_crumble` | Single crumbling voxel platform tile (cracks, chunks) | Arena tile + collapse VFX base |
| 4 | `hazard_prop_spikebox` | One hazard prop — spiked / warning cube (original, not Minecraft IP) | Periodic knock / scare prop |

**Credit budget:** Target **100–150** Tripo points for these 4. Escalate / confirm with user if estimate **>200**.

**Gallery publish path:** Only under `/workspace/gallery/tripo/blockbean-collapse/` (and subfolders as needed).

---

## 8. Scope — v0 browser demo

**In scope**

- One HTML page + Three.js (or PlayCanvas-lite) scene  
- 4–8 entities (1 human + AI bots)  
- Collapse + jump + push gameplay loop  
- Win/lose UI (中文): 「你赢了！」「出局了！」+ replay button  
- Placeholder or Tripo-imported GLB for the 4 assets  
- Simple audio: pop on collapse, thud on push, sting on win  
- Shareable link / local static host  

**Explicitly out of scope (v0)**

- Unity / Unreal / Netcode / accounts / rankings  
- Multiple maps, cosmetics shop, battle pass  
- Mobile touch UI, controller remapping  
- Minecraft / Fall Guys / 蛋仔 assets, names, or lookalikes  
- Voice chat, spectator mode, replay editor  

**Bug iteration handoff:** User iterates in chatgpt.com Codex later — keep code modular (`game/`, `entities/`, `arena/`).

---

## 9. IP / originality notes

- Characters are **original「方块豆人」** cube-bean avatars only.  
- **NO** Creeper, **NO** Fall Guys bean silhouette IP, **NO** 蛋仔 / 网易 trademarks, logos, or distinctive costume copies.  
- World is **generic voxel cubes** — not Minecraft block atlas, not Mojang branding.  
- Hazard prop must read as original “warning cube,” not TNT / creeper face.  
- Marketing copy uses our titles only; avoid “Fall Guys-like” / “蛋仔派对” in store text if publishing publicly (internal pitch may compare genre).

---

## 10. Success criteria (this PRD phase)

- [x] PRD + ASSET_BRIEF written under gallery path  
- [ ] Image sheets generated next (separate task)  
- [ ] Tripo multiview → GLB (Tripo MCP later)  
- [ ] Browser demo playable 15–60s round  

**Role split:** PRD / images / coding = this bot · 3D = Tripo MCP later · Bugs = user Codex handoff.
