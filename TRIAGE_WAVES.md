# 方块豆人 — 下一波分诊 / TRIAGE_WAVES

**Locked:** 用户勾选 **#1–#10 全做** · **Spread A,B,C,F,G** · **Engineering T1–T8** · **Juice J1–J8** · **Micro tweaks M1–M8** · **Onboarding O2–O6** · **Retention R2/R3/R4/R6** · **Social clip S1/S3–S6** · **Balance B1–B6** · **Accessibility A2–A6** · **Modes D2/D4/D6** · **Maps P1–P6** · **Audio U1–U4/U6** · **Monetization N1/N2/N4/N5** · **Spectator C1–C5** · **Ops K1–K5**.  
**Play:** https://blockbean-collapse.vercel.app  
**Repo:** https://github.com/liush2yuxjtu/blockbean-collapse  
**PRD:** [PRD.md](./PRD.md) §9–§13（含 Spread / Engineering / Juice / Micro + Game surfaces）· **Handoff:** [CODEX_HANDOFF.md](./CODEX_HANDOFF.md)

**Do not treat this as done until a coding agent implements it.** This file is the backlog + acceptance checklist.

---

## Role split / 角色分工

| Role | Who | Notes |
|------|-----|-------|
| Coding (physics, juice, AI, UI, perf, touch, audio, spectate, Spread, Engineering, Micro, Game surfaces) | Codex / cloud agent | Wave 1–2 primary; Spread / Engineering / Juice / Micro / surfaces from this file + PRD §12 |
| 3D skins / map variants | Tripo bot | Estimate credits before generate; Wave 3 |
| Iterative bugfix | User Codex | Local playtest → fix loop（CODEX_HANDOFF 格式） |

---

## Wave 1 — 手感 + 病毒镜头（先做）

### 1. 物理：边缘 AABB、coyote、跳跃缓冲
Physics: edge standing/drop fix, coyote time, jump buffer.

**Acceptance**
- [x] Standing with feet overlapping a solid tile (not only center-point) keeps the bean grounded
- [x] Walking off a gap drops when support under feet is gone (no “悬空站立”)
- [x] Coyote: leave ground → Space within ~100–150ms still jumps
- [x] Jump buffer: press Space slightly before landing → jump on land
- [x] No new console errors; desktop still ~60fps in empty lobby

### 2. Juice：推人 VFX、镜头冲击、预警 glow、出局反馈
Juice: push particles, camera punch, clearer collapse warn, out feedback.

**Acceptance**
- [x] Successful push shows short particle / burst at contact
- [x] Push and nearby collapse trigger brief camera / FOV punch
- [x] Warned tiles are readable at a glance (stronger glow and/or shake vs solid)
- [x] On out: clear CN feedback（「出局了！」）+ short visual (flash / fall cam)
- [x] Feel still clip-friendly in first 3s of a round

### 3. 更聪明 AI：躲预警格、躲尖刺箱、边缘推人
Smarter AI: avoid warned tiles, avoid spikebox, push at edges.

**Acceptance**
- [x] Bots prefer non-warned tiles when pathing
- [x] Bots steer away from spikebox knock radius when possible
- [x] Adjacent bot near an edge attempts push toward void more often than center
- [x] Lobbies of 4–8 still fill; bots don’t all suicide same tile every round

### 4. Sudden-death 最后 2×2
Sudden-death final 2×2 (from PRD).

**Acceptance**
- [x] When only inner 2×2 (or ≤4 tiles) remain, shake / warn cadence clearly intensifies
- [x] Round still ends with last bean win or timer tiebreak
- [x] Visible in ≥1 replay without cheating spawn (natural shrink)

### 5. 结果页：胜负、推人分、可复制文案 + 短链
Result/share screen: win/lose, push score, shareable copy + short link.

**Acceptance**
- [x] End screen shows 赢了 / 出局了 + push score
- [x] One-tap copy share text (CN) including play URL
- [x] Replay / R still works
- [x] Optional: `va` event on result view / share copy

---

## Wave 2 — 触达 + 打磨

### 6. InstancedMesh（64 tile 性能）
InstancedMesh for 64 tiles (perf).

**Acceptance**
- [x] Arena tiles rendered via InstancedMesh (or equivalent low draw-call path)
- [x] Warn / fall still visually correct per tile
- [x] Measurable draw-call drop vs 64 clones; mid/low laptop playable

### 7. 移动端触控
Mobile touch controls.

**Acceptance**
- [x] Virtual stick moves; on-screen Jump + Push work
- [x] Full round completable on phone browser (portrait OK)
- [x] Does not break desktop WASD / Space / push

### 8. 音效 / BGM（塌、推）
SFX / BGM for collapse & push.

**Acceptance**
- [x] Distinct SFX on tile warn/fall and on successful push
- [x] Win / out sting optional but preferred
- [x] Mute or low default volume so autoplay policies don’t break start
- [x] Keep Insights script; optional `va` on audio unlock

### 10. 出局后观战切换
Spectate switch after elimination (+ optional simple replay later).

**Acceptance**
- [x] After local out, camera can follow another living bean (tap / key cycle)
- [x] Round continues until real winner; UI shows spectating state
- [x] Full replay editor still out of scope

---

## Wave 3 — 内容

### 9. 更多皮肤 / 地图变体（Tripo）
More skins / map variants (Tripo credits; estimate before generate).

**Acceptance**
- [ ] Credit estimate written before generate; if **>200**, user confirmed
- [ ] New GLBs land in repo `assets/` without compressing existing v0 GLBs
- [ ] At least one alternate skin or map tile set selectable or swappable in demo
- [ ] Codex does **not** author 3D — Tripo bot only

---


---

## Spread wave — 传播波（A,B,C,F,G · NOT D,E,H）

| ID | Item | Status | Acceptance |
|----|------|--------|------------|
| **A** | Opening 3s hook — auto-play collapse/push clip before Start | ✅ | Clip autoplays (muted OK) before Start; skippable; first 3s show collapse or push |
| **B** | Shorter harsher rounds — 25–35s, denser collapses | ✅ | Default round 25–35s; denser tile collapses; still crowns last bean; no long dead air |
| **C** | Meme result copy — random roast + one-tap 小红书/剪映 | ✅ | End screen random CN roast lines; one-tap copy suitable for Xiaohongshu/Jianying; includes play URL |
| **F** | Light leaderboard — local best streak / push score | ✅ | Persist local best win streak + push score (localStorage); optional anonymous board OK; no accounts |
| **G** | Local 2P same screen — split keyboard, no netcode | ✅ | Two players same screen, split keys (e.g. WASD+push vs arrows+push); **no netcode** |

**Explicitly NOT in this wave:** ☐ ~~D GIF replay~~ · ☐ ~~E daily seed~~ · ☐ ~~H gacha skins~~ （do not implement）

**Scheduling:** Wave 1–2 still primary if unfinished; Spread may run **parallel** or after.

---

## Engineering wave — 工程波（T1–T8 全做）

| ID | Item | Status | Acceptance |
|----|------|--------|------------|
| **T1** | Split `game.js` into modules (arena/beans/input/ui) | ✅ | Modules exist; v0 behavior parity; static serve still works (no mandatory bundler, or documented tiny build) |
| **T2** | Playwright regression CI (load→start→fall→result) | ✅ | CI runs load → start → fall/out → result; fails block merge on PR/`main` |
| **T3** | Enrich analytics events (duration, push_count, etc.) | ✅ | Events include duration + push_count (and similar); keep Insights/`va`; no PII |
| **T4** | Error boundaries (WebGL fail / GLB 404 fallback UI) | ✅ | Readable fallback UI on WebGL fail or GLB 404; box substitutes still playable |
| **T5** | Asset strategy without compressing GLBs | ✅ | No GLB compress/re-export; critical preload + lazy rival (or equivalent) |
| **T6** | Pause + reduce motion | ✅ | Esc pauses; option disables shake / cam punch |
| **T7** | i18n CN/EN HUD toggle | ✅ | HUD/result strings toggle CN↔EN; default CN |
| **T8** | LICENSE + CONTRIBUTING for public repo | ✅ | Root `LICENSE` + `CONTRIBUTING.md` present and accurate |

**Scheduling:** Parallel OK with Wave 1–2 / Spread (esp. T1/T2/T3/T8); do not block feel/spread play acceptance.

---

## Juice checklist — Juice 清单（J1–J8 全做；含 J4+J5）

Aligns with / expands Wave 1 #2. Respect T6 reduce motion.

| ID | Item | Status | Acceptance |
|----|------|--------|------------|
| **J1** | Push impact — FOV punch, light screen shake, rival flash | ✅ | On successful push: FOV punch + light shake + rival flash; shake off when reduce-motion |
| **J2** | Collapse warn layer — edge glow pulse, crack flash, tick SFX | ✅ | Warned tiles: edge glow pulse + crack flash; tick SFX (muteable) |
| **J3** | Collapse moment — fall trail, dust particles, low rumble | ✅ | On fall: trail + dust + low rumble (muteable) |
| **J4** | Out sequence — brief slow-mo, cam pullback, 「出局了！」pop | ✅ | On out: short slow-mo + cam pullback + 「出局了！」pop |
| **J5** | Jump land — squash + land dust | ✅ | On land: visible squash + land dust; snappy, not sluggish |
| **J6** | Multi-push float text — 「再推！」「双推」 | ✅ | Multi-push shows float text (再推/双推); does not block controls |
| **J7** | Final 2×2 heartbeat — red tint, faster beat, edge flash | ✅ | With sudden-death: red tint + faster heartbeat cadence + edge flash |
| **J8** | Win celebration — confetti/bean hop + win sting | ✅ | On win: confetti or bean hop + win sting |

**Scheduling:** Prefer with Wave 1 #2; may stack with Spread A/C visual hooks.

---

## Micro tweaks — 微调波（M1–M8 全做）

| ID | Item | Status | Acceptance |
|----|------|--------|------------|
| **M1** | Push cooldown feel — short windup, clear recovery | ✅ | Push has short windup + clear recovery; cooldown readable (UI or feel); not sluggish |
| **M2** | Camera damping / follow lag | ✅ | Chase cam has damping / follow lag; tracks without jitter; tighter when reduce-motion |
| **M3** | Collapse pace curve — slow then rush | ✅ | Collapse cadence starts slower then rushes; still crowns last bean; no long dead air |
| **M4** | Bot count / spawn spread | ✅ | Bot count + spawn spread tunable; no start clump; 4–8 still playable |
| **M5** | HUD size & contrast — mobile readable | ✅ | HUD size/contrast readable on phone; does not block controls |
| **M6** | Start button gated until load ready | ✅ | Start disabled/grey until assets ready; enabled after; loading feedback visible |
| **M7** | Emphasize R restart on result screen | ✅ | Result screen clearly highlights **R** to restart; keyboard R still works |
| **M8** | Mute preference persisted | ✅ | Mute choice saved to localStorage; survives refresh |

**Scheduling:** Parallel OK with Wave 1–2 / Juice / Engineering; small tweaks may interleave; do not block main play acceptance.

---

## Onboarding — 新手引导（O2–O6 · NOT O1）

| ID | Item | Status | Acceptance |
|----|------|--------|------------|
| **O2** | Practice island / safe first round | ☐ | First round or practice island: no lethal collapse/push pressure (or heavily softened); player can learn move/jump/push; then enter real round |
| **O3** | Start gated until load ready + visible progress | ☐ | Start disabled until assets ready; visible progress (bar/%/copy); enabled after; aligns with M6 |
| **O4** | Contextual tip on first out / first win (once) | ☐ | Tip once on first out and once on first win (CN); never repeats after |
| **O5** | Skip + never-show-again persisted | ☐ | Tips/onboarding skippable; “never show again” in localStorage; survives refresh |
| **O6** | Ghost demo bean for 5s if idle on title | ☐ | After ~5s idle on title, ghost demo bean shows move/push/collapse; interruptible; does not block Start |

**Explicitly NOT in this lock:** ☐ ~~O1~~ （do not implement）

**Scheduling:** Parallel OK with Wave 1–2; do not block Wave 1–2 feel acceptance.

---

## Retention — 留存（R2, R3, R4, R6 · NOT R1, R5）

| ID | Item | Status | Acceptance |
|----|------|--------|------------|
| **R2** | Win / play streak counter (localStorage) | ☐ | Shows win and/or play streak; persists localStorage; loss resets win streak (play-streak rule documented) |
| **R3** | Soft return reward copy after N days away | ☐ | After ≥N days away, soft return copy on visit (no paywall); N configurable; copy/light feedback only |
| **R4** | Personal best board (pushes, survival time) | ☐ | Local personal bests: pushes, survival time, etc.; readable on result; no accounts |
| **R6** | Yesterday vs today one-line compare on result | ☐ | Result shows one-line yesterday vs today (rounds/pushes/etc.); gentle empty state if no data |

**Explicitly NOT in this lock:** ☐ ~~R1~~ · ☐ ~~R5~~ （do not implement）

**Scheduling:** Parallel OK with Spread F / result screen; do not block Wave 1–2 feel.

---

## Social clip — 社交切片（S1, S3–S6 · NOT S2）

| ID | Item | Status | Acceptance |
|----|------|--------|------------|
| **S1** | Result share card (canvas/PNG) with score + hook line | ☐ | End can export canvas/PNG share card: score + hook line; download/copy; play URL hint |
| **S3** | Auto last-10s buffer for out / win (client-only) | ☐ | On out/win, client keeps ~last 10s buffer (local only); hook for review/export; no server |
| **S4** | Spectate watermark / handle field for clips | ☐ | Spectate/clip shows watermark or editable handle; default non-blocking; can disable |
| **S5** | Opening 3s hook freeze-frame for screen record | ☐ | 3s hook freeze-frame (collapse or push) for screen record; stacks with Spread A without conflict |
| **S6** | Defeat / clutch title variants for share text | ☐ | Share text has defeat / clutch title variants; random or contextual; CN readable |

**Explicitly NOT in this lock:** ☐ ~~S2~~ （do not implement）

**Scheduling:** Parallel OK with Spread A/C and result screen; do not block Wave 1–2 feel.

---

## Balance — 数值平衡（B1–B6 全做）

| ID | Item | Status | Acceptance |
|----|------|--------|------------|
| **B1** | Push force + cooldown table (easy / default / spicy) | ☐ | Three tiers easy/default/spicy for push force + cooldown; switchable or debug; feel differs |
| **B2** | Collapse pace curve presets | ☐ | Pace presets (e.g. slow-rush / steady); switchable; aligns with M3 |
| **B3** | AI difficulty tiers | ☐ | AI difficulty tiers (avoid warn / edge push etc.); switchable; 4–8 still playable |
| **B4** | Bot count + spawn spread knobs | ☐ | Bot count + spawn spread knobs; no start clump; aligns with M4 |
| **B5** | Round length target band | ☐ | Target round-length band configurable (e.g. 25–35s / 15–60s); no conflict with Spread B |
| **B6** | Exposed BALANCE constants block | ☐ | Central `BALANCE` (or equiv.) constants block; one place tunes knobs; short comments |

**Scheduling:** Parallel OK with Wave 1 / Micro; do not block feel acceptance.

---

## Accessibility — 无障碍（A2–A6 · NOT A1）

| ID | Item | Status | Acceptance |
|----|------|--------|------------|
| **A2** | Colorblind-safe warn / out / win palette | ☐ | Warn/out/win colors colorblind-safe (not red/green only); verifiable contrast |
| **A3** | Captions / icon for critical SFX | ☐ | Critical SFX (warn, out, win) have caption or icon; readable even when muted |
| **A4** | Remappable keys + touch hit-target size | ☐ | Keys remappable; touch hit-targets large enough; desktop defaults intact |
| **A5** | HUD scale / contrast presets | ☐ | HUD scale/contrast presets; aligns with M5; phone readable |
| **A6** | Pause (Esc) + hold-to-confirm quit | ☐ | Esc pauses; quit needs hold or confirm; aligns with T6 |

**Explicitly NOT in this lock:** ☐ ~~A1~~ （do not implement）

**Scheduling:** Parallel OK with Engineering T6 / Micro M5; do not block Wave 1–2 feel.

---

## Modes — 模式（D2, D4, D6 · NOT D1, D3, D5）

| ID | Item | Status | Acceptance |
|----|------|--------|------------|
| **D2** | No-push — survival only | ☐ | No-push mode: move/jump only; push disabled or hidden; still crowns last bean |
| **D4** | Hazard rain — periodic spike drops | ☐ | Periodic spike/hazard drops; dodgeable; does not permanently seal core island |
| **D6** | Ghost trail — rivals leave short path ghosts | ☐ | Rivals leave short path ghosts; direction readable; ghosts do not block physics |

**Explicitly NOT in this lock:** ☐ ~~D1~~ · ☐ ~~D3~~ · ☐ ~~D5~~ （do not implement）

**Scheduling:** Prefer after Wave 1–2 feel is stable; parallel OK then; do not block main loop acceptance.

---

## Maps — 地图（P1–P6 全做）

| ID | Item | Status | Acceptance |
|----|------|--------|------------|
| **P1** | Layout pool of 3 authored grids | ☐ | ≥3 authored grid layouts rotatable/pickable; collapse rules still hold |
| **P2** | Theme pack A — grass / dirt | ☐ | Grass/dirt theme pack applicable; do not compress existing GLBs |
| **P3** | Theme pack B — ice / slippery | ☐ | Ice/slippery theme; movement has perceptible slide; still controllable |
| **P4** | Theme pack C — night neon | ☐ | Night neon theme; warn/HUD still readable |
| **P5** | Center pit / ring variants | ☐ | Center-pit / ring layout variants; still crowns last bean |
| **P6** | Map pick screen (local; random default) | ☐ | Local map pick screen; random default; works offline |

**Note:** Tripo theme meshes — **estimate credits before generate**; if **>200**, user confirmed. Codex wires code only; Tripo authors 3D.

**Scheduling:** Align with Wave 3 / Tripo; layout/pick UI may land in code first; do not block Wave 1–2 feel.

---

## Audio — 音频（U1–U4, U6 · NOT U5）

| ID | Item | Status | Acceptance |
|----|------|--------|------------|
| **U1** | Layered SFX bus | ☐ | Layered SFX bus (push/collapse/UI etc.); not muddy; muteable |
| **U2** | BGM bed with intensity duck on warn | ☐ | BGM bed; ducks intensity on warn; can disable |
| **U3** | Mute / volume persisted | ☐ | Mute/volume in localStorage; aligns with M8 |
| **U4** | Out / win sting one-shots | ☐ | Distinct out/win sting one-shots; muteable |
| **U6** | Spatial-lite pan on left/right pushes | ☐ | Left/right pushes have light pan; mono still OK |

**Explicitly NOT in this lock:** ☐ ~~U5~~ （do not implement）

**Scheduling:** Parallel OK with Wave 2 #8 / Juice; do not block feel.

---

## Monetization — 变现（N1, N2, N4, N5 · NOT N3；never gate core loop）

| ID | Item | Status | Acceptance |
|----|------|--------|------------|
| **N1** | Cosmetic-only skins catalog | ☐ | Skins catalog is cosmetic-only; no gameplay stat change |
| **N2** | Free starter + unlock-by-streak skins | ☐ | Free starter skin + streak-unlock skins; no pay-to-play |
| **N4** | Clear ads-never / no-IAP-in-v1 scope line | ☐ | Docs/UI state v1: **no ads, no IAP** |
| **N5** | Skin preview on title without purchase flow | ☐ | Title can preview skins; no purchase/checkout flow |

**Explicitly NOT in this lock:** ☐ ~~N3~~ （do not implement）

**Hard rule:** Never gate core loop (push/jump/collapse/win) behind IAP or ads.

**Scheduling:** Catalog/preview parallel OK; 3D skins = Tripo; do not block Wave 1–2.

---

## Spectator — 观战（C1–C5 全做）

| ID | Item | Status | Acceptance |
|----|------|--------|------------|
| **C1** | After out: cycle survivors | ☐ | After local out, cycle living beans; round continues to real winner |
| **C2** | Spec HUD: alive count + next collapse tip | ☐ | Spec HUD shows alive count + next-collapse tip; non-blocking |
| **C3** | Soft follow cam + optional free look | ☐ | Soft follow cam; optional free look; default not nauseating |
| **C4** | Caption strip for big moments | ☐ | Caption strip for big moments (multi-push/final); can disable |
| **C5** | Return-to-lobby without killing round view | ☐ | Return to lobby does not forcibly kill spectate view (or confirms); round logic not corrupted by mis-tap |

**Scheduling:** Aligns with / expands Wave 2 #10; parallel OK; do not block feel.

---

## Ops — 运维（K1–K5 全做）

| ID | Item | Status | Acceptance |
|----|------|--------|------------|
| **K1** | Version / build banner | ☐ | Visible version/build banner or corner mark (dev/prod readable) |
| **K2** | Remote JSON flags with local fallback | ☐ | Remote JSON flags; on failure fall back to local defaults; does not block start |
| **K3** | Soft maintenance message screen | ☐ | Soft maintenance screen (copy + return); not a hard process kill |
| **K4** | Client error beacon analytics doc link | ☐ | Client error beacon + analytics doc link; no PII |
| **K5** | Kill-switch to force box fallback assets | ☐ | Kill-switch forces box fallback (skip GLB); still playable |

**Scheduling:** Parallel OK with Engineering T3/T4; do not block Wave 1–2 feel.

---

## Reference docs

- [PRD.md](./PRD.md) — §8 Shipped · §9 Waves (+ Spread / Engineering / Juice / Micro + Game surfaces) · §12 Codex notes · §13 Success  
- [CODEX_HANDOFF.md](./CODEX_HANDOFF.md) — known v0 bugs + file map  
- [ASSET_BRIEF.md](./ASSET_BRIEF.md)

Play live: https://blockbean-collapse.vercel.app
