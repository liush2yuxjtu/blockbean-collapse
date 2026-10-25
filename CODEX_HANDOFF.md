# CODEX HANDOFF — BlockBean Collapse (PRD v1)

**Canonical repo:** https://github.com/liush2yuxjtu/blockbean-collapse (`main` → Vercel auto-deploy)  
**Live:** https://blockbean-collapse.vercel.app  
**Gallery mirror (optional):** `/workspace/gallery/tripo/blockbean-collapse/`

> **Start here for what to build:** [PRD.md](./PRD.md) §9 下一波分诊（Wave 1–3 + Spread + Engineering + Juice + Micro + **Game surfaces** O/R/S/B/A/D/P/U/N/C/K）· §10 Scope · §12 Codex 执行说明 · §13 Success  
> **Checkbox backlog + acceptance:** [TRIAGE_WAVES.md](./TRIAGE_WAVES.md) — Wave 1–3 · Spread A,B,C,F,G · Engineering T1–T8 · Juice J1–J8 · Micro M1–M8 · **Onboarding O2–O6 · Retention R2/R3/R4/R6 · Social clip S1/S3–S6 · Balance B1–B6 · Accessibility A2–A6 · Modes D2/D4/D6 · Maps P1–P6 · Audio U1–U4/U6 · Monetization N1/N2/N4/N5 · Spectator C1–C5 · Ops K1–K5**
>
> **Priority:** Wave 1–2 still **primary** if unfinished. Spread may run **parallel** or after. Engineering + Juice + Micro + new Game surfaces may run parallel (Juice hangs on Wave 1 #2; Micro/surfaces may interleave; must not block Wave 1–2 feel acceptance).
> **Not in Spread:** D GIF replay · E daily seed · H gacha skins.

## File map

- `index.html` — splash (keyart), importmap three@0.160.0 (unpkg), loads `game.js`, Vercel Insights `/_vercel/insights`
- `game.js` — asset loading + `fit()` normalize, `reset()` round setup, `control()` input/AI/push, `physics()` gravity + tile ground + bean separation, `loop()` tiles crack/fall, spikebox, win check, camera, HUD. Debug: `window.__game`
- `assets/{hero,rival,tile,spikebox}/model.glb` plus `assets/tile_{grass,ice,neon}/model.glb` (2–4.5 MB each; tile sets are swapped into the InstancedMesh after the Start gate)
- Docs: `PRD.md` (v1), `TRIAGE_WAVES.md`, `ASSET_BRIEF.md`, `README.md`

## Codex rules（执行约束）

1. Work **only** in this GitHub repo; open PR → merge `main` (Vercel deploys).  
2. **Do not compress / re-export GLBs.**  
3. Keep `/_vercel/insights` + existing `va` events; add events for result / share / spectate / touch if useful.  
4. Hand leftover bugs back in this same format (issue + repro + acceptance).  
5. **3D skins / new maps = Tripo bot**, not Codex.  
6. Implement **Wave 1 first**, then Wave 2. Wave 3 is Tripo-led. Spread / Engineering / Juice: see priority note above (parallel OK; Wave 1–2 unfinished → still primary).

## Known issues（v0 已知问题 → map to waves）

| # | Issue | Wave |
|---|-------|------|
| 1 | 手写 AABB：边缘只看中心点 → 悬空站立 / 提前掉落。Repro: walk to tile edge next to a gap. | W1 #1 |
| 2 | Tile GLB 顶面用包围盒对齐，模型不平时豆人陷入/浮空 | W1 #1 |
| 3 | Rival 染色覆盖 material.color，带贴图时偏暗/怪 | polish / later |
| 4 | AI 笨：随机安全格、不会躲尖刺箱 | W1 #3 |
| 5 | 推（E）仅缩放反馈，无粒子/音效；出局无观战切换 | W1 #2 · W2 #8/#10 |
| 6 | 64 tile clone × 材质 → draw calls 高 | W2 #6 |
| 7 | 首次 ~12 MB GLB 无进度条；无移动端触控 | W2 #7 (+ loading polish) |
| 8 | 计时结束得分简单（存活+10，推人+1） | W1 #5 |
| 9 | 未做 sudden-death 最后 2×2 | W1 #4 |

## Acceptance checks（v0 shipped baseline）

- Prod: https://blockbean-collapse.vercel.app returns 200  
- 点击开始 → 倒计时 3-2-1 → WASD 移动、Space 跳、推开近距离 bot  
- 60s 内平台逐步变红坠落；掉出 y<-15 判出局；最后一人/计时结束显示胜者，R 重开  
- 删除/改名任一 model.glb 后游戏仍可运行（方块替代）  
- Console 无报错；~60fps on desktop  

**Wave acceptance:** see each item under [TRIAGE_WAVES.md](./TRIAGE_WAVES.md) (Wave 1–3 · Spread · Engineering · Juice · Micro · Onboarding / Retention / Social clip / Balance / Accessibility / Modes / Maps / Audio / Monetization / Spectator / Ops).

## P0 HOTFIX — `round_end` almost never fires (2026-10-26 telemetry)

**Evidence (Vercel custom events, 2026-10-01→10-26):** `game_start` visitors=4 / count=5 · `player_eliminated` visitors=3 / count=5 · **`round_end` visitors=1 / count=1** · `return_to_lobby`=0 · share events=0.

### Why (root cause — not “Insights broken”)

`round_end` is **only** emitted inside `endRound()`, and `endRound()` runs only when the **match** resolves:

- `alive.length <= 1`, or
- `timer <= 0`

When the **local player** falls (`y < -15`), code only:

1. sets `alive=false`, enters **spectate**, flashes “你出局了！观战中”
2. fires **`player_eliminated`**
3. does **not** call `endRound()` / does **not** show the result card

So the common path is: start → die → spectate briefly → **close tab**. Tab close never hits `endRound`, so **`round_end` never fires**. That also starves share (S1) and retention tips that live on the result screen.

Secondary amplifiers:

1. **Practice first run** (`practiceRound`): no tile collapse, bots don’t push → hard to force a natural end except waiting full `roundSeconds` (default 30s) or walking off yourself. Many leave mid-practice.
2. **`quitToLobby`** (pause hold-quit) sets `state='menu'` and fires `return_to_lobby` **without** `round_end` / abandon (telemetry showed 0 returns; still a hole).
3. No `pagehide` / `visibilitychange` **abandon** beacon.

This conflicts with how players treat “I fell = my run is over,” even though Spectator **C1** wants optional post-out watching.

### Product decision (lock for Codex)

**Result-first, spectate-optional** (keeps C1, fixes funnel):

1. On **local** elimination during `play` (or practice): call a single path that:
   - shows the **result card immediately** (lose / practice-complete as today)
   - fires **`round_end` once** with existing payload fields plus `end_reason: 'local_out' | 'last_alive' | 'timer' | 'practice_done'`
   - offers primary **再来一局** and secondary **继续观战** (C1 cycle survivors). Spectate must not require waiting for `round_end`.
2. If the player chooses **继续观战** and later the match resolves, fire **`match_end`** (new, optional) with final `winner` / `alive` — do **not** double-count as a second `round_end`.
2b. **Leave spectate early (user ask 2026-10-26):** while spectating after local out (result shown or skipped into spectate), always offer:
   - **再来一局 / Next** → `reset()` immediately (do not wait for last bean / timer); fire `__va('spectate_next', {})` then start next round.
   - **退出 / Leave** → same as lobby quit: tear down round → splash/lobby; fire `__va('spectate_leave', { survival_s })` (and `round_abandon` only if `round_end` never fired).
   - Keyboard: **R** = next round even while spectating (not only when `state==='over'`); **Esc** pause still works; confirm-quit can map to Leave.
   - Must work from result card *and* from in-spectate HUD (button or hold-quit), so the player is never trapped watching bots.
3. Practice: end when **local falls** OR **player lands ≥1 push** OR **15s elapsed** (whichever first) → `round_end` with `result:'practice'`. Do not require full 30s with no collapse.
4. Instrumentation hygiene (same PR):
   - `pagehide` / `visibilitychange`(hidden) while `state` in `count|play` or spectating-after-out without having fired `round_end` → `__va('round_abandon', { state, survival_s, practice })`
   - `quitToLobby` → same `round_abandon` if no `round_end` yet
   - `endRound` must be idempotent (`if (state === 'over') return` after first fire)

### Acceptance

- [x] Local fall in a real round → result card visible **without** waiting for last bean / timer; **exactly one** `round_end` with `end_reason:'local_out'`, `result:'lose'`.
- [x] “继续观战” still cycles survivors (C1); finishing the match while spectating emits `match_end` (not a second `round_end`).
- [x] During spectate: **再来一局** / **R** starts next round immediately; **退出** returns to lobby/splash; player is never stuck watching until last bean.
- [x] `spectate_next` / `spectate_leave` events fire on those actions.
- [x] Practice ends within ≤15s or on first local fall / first player push; emits `round_end` `result:'practice'`.
- [x] Close tab mid-round (before result) → `round_abandon` observed in Vercel within a test session.
- [x] Playwright (or manual): load → start → walk off map → assert result UI + `round_end` path (hook `__va` or DOM).
- [ ] After fix, expect `round_end` count ≳ `player_eliminated` (local) over a few human sessions; share buttons reachable again.

### Out of scope this hotfix

- Reworking C2–C5 HUD polish beyond the “继续观战” entry.
- [x] `audio_unlock` fires once per page load (`audioUnlockEvented` guard in `unlockAudio`; still resumes AudioContext when suspended).
- Investigating `runtime_fallback` WebGL rate (separate).

**Implement in** `game.js` (+ Playwright if T2 harness exists). Docs: sync this section; mark TRIAGE Spectator C1 note = result-first.

---

## P0 UX — Death tumble + chase cam + Tripo skinned beans (2026-10-26)

**Shipped in code (this PR branch `fix/death-chase-cam`) — no Tripo spend:**

1. **Fall death watch:** when the hero is eliminated by fall/push-off, `beginFallDeath` keeps the mesh tumbling ~0.8–1.5s (`fallingDeathT`) while the chase cam stays on them; **then** `finishFallDeath` → result-first `endRound(local_out)`. Not an instant cut to result/spectate.
2. **Chase cam + punch:** camera orbits behind the hero using smoothed `camChaseYaw` from bean facing (over-shoulder offset). Impact `punch()` kicks in **camera-local** axes (right / up / back along look), not world-fixed random shake.
3. **Bean facing:** game forward is local **+Z** (`atan2(mx,mz)`, push ray, chase cam behind `-forward`). Tripo hero/rival GLBs native face **+X**; `attachBeanRig` sets `visual.rotation.y = -Math.PI / 2` so face maps to +Z (chase from -Z sees the back). Walk lean / push lunge use the same +Z axis — cam stays behind the back, not the face.
4. **Motion feel without new GLBs:** existing hero/rival GLBs are static (0 skins / 0 clips). `updateBeanMotionFeel` adds procedural lean / run bob / fall stretch on the visual child. `AssetClips` + `AnimationMixer` hooks on `makeBean` so a skinned/animated GLB drop-in works without rewriting gameplay.

### Exact Tripo asks for `tripo-3d-bot` (do NOT invent GLBs in Codex PRs)

| ID | Deliverable | Why |
|----|-------------|-----|
| `hero_blockbean_skinned` | Same silhouette as current hero, **skinned** (root + spine + arms + legs), T-pose bind | Enables real clips |
| `rival_blockbean_skinned` | Same topology as hero, coral tint | Shared clip retarget |
| `clip_walk` | Loop walk / jog in place, ~1s, root motion optional (prefer in-place) | Locomotion |
| `clip_push` | Short shove / shoulder-check, ~0.4s | Push juice |
| `clip_fall` / `clip_ragdoll_flail` | Tumbling / flail while falling, ~1–1.5s | Death watch replaces procedural spin when present |
| Export | `assets/{hero,rival}/model.glb` **or** side-by-side `model_skinned.glb` + clip names `walk`/`push`/`fall`/`idle` | Load path already reads `g.animations` into `AssetClips[name]` |

**Acceptance for Tripo drop-in:**

- Replace or add GLB under `assets/hero` / `assets/rival` (do not compress).
- Clips named so `makeBean` picks `walk`/`idle`/`push`/`fall` (case-insensitive).
- On load, `AssetClips.hero.length > 0` and mixer plays; procedural lean becomes fallback only when clips missing.
- Death watch prefers `actions.fall` if present (follow-up wire is one-liner in `beginFallDeath`).

**Out of scope for the code PR:** generating / refining Tripo meshes, spending Tripo credits, rewriting ASSET_BRIEF style bible.

---

## P0 UX — Code bean rig (no Tripo spend) (2026-10-26)

**Branch `fix/code-bean-rig`.** User chose code-side articulation over Tripo credit spend.

1. **`modules/beanRig.js`:** Object3D hierarchy `tumble → hips → { torso(visual), armL/R, legL/R }` wrapped around existing static hero/rival GLBs (or capsule fallback).
2. **Clips in code:** walk cycle (limb swing + lean), push lunge, fall tumble + limb flail. Death watch / chase cam unchanged — fall drives `tumble` root.
3. **`AssetClips` / mixer hooks kept** for a future skinned GLB drop-in; procedural rig is the default when clips are empty.
4. **Playwright:** asserts rig parts on hero+NPC, walk lean + `clip==='walk'` + limb swing, fall `clip==='fall'` + tumble/flail motion, then result-first `local_out`.

**Do not** call Tripo MCP or regenerate GLBs for this PR.


## P0 UX — Cam-relative screen-forward move (2026-10-26)

**Branch `fix/cam-relative-move`.** W/up = +mz (screen forward); touch stick Y inverted into +mz; human wish rotated by `camChaseYaw` into world (AI unchanged). W at yaw≈0 moves +Z, face away from cam, cam stays behind.

## P0 UX — Bean visual yaw -π/2 (2026-10-26)

**Branch `fix/bean-face-yaw-neg90`.** Ortho proved Tripo face is +X (not -Z); `visual.rotation.y = -π/2` maps face→+Z so chase sees back. Cam-relative W/+mz from #19 unchanged.

## Perf telemetry (2026-10-26)

**Branch `feat/perf-speed-telemetry`.** `__va` events `perf_frame_spike` / `perf_sample` / `perf_speed_anomaly` / `perf_resume` (see `modules/perfTelemetry.js`); visibility/unpause discards `THREE.Clock` backlog so resume never applies a fat 0.05s step.

## Ops — audio_unlock once (2026-10-26)

**Branch `fix/audio-unlock-once`.** `unlockAudio()` still resumes a suspended AudioContext on every gesture, but `__va('audio_unlock', { first: true })` fires only once per page load via `audioUnlockEvented`.

