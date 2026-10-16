# 方块豆人 — 下一波分诊 / TRIAGE_WAVES

**Locked:** 用户勾选 **#1–#10 全做**.  
**Play:** https://blockbean-collapse.vercel.app  
**Repo:** https://github.com/liush2yuxjtu/blockbean-collapse  
**PRD:** [PRD.md](./PRD.md) §9–§13 · **Handoff:** [CODEX_HANDOFF.md](./CODEX_HANDOFF.md)

**Wave 1–2 code is implemented on the active PR branch. Live WebGL smoke validation remains environment-dependent; Wave 3 remains Tripo-gated.** This file is the backlog + acceptance checklist.

---

## Role split / 角色分工

| Role | Who | Notes |
|------|-----|-------|
| Coding (physics, juice, AI, UI, perf, touch, audio, spectate) | Codex / cloud agent | Wave 1–2 from this file + PRD §12 |
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
- [ ] Optional: `va` event on result view / share copy

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
- [ ] Keep Insights script; optional `va` on audio unlock

### 10. 出局后观战切换
Spectate switch after elimination (+ optional simple replay later).

**Acceptance**
- [x] After local out, camera can follow another living bean (tap / key cycle)
- [x] Round continues until real winner; UI shows spectating state
- [ ] Full replay editor still out of scope

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

## Reference docs

- [PRD.md](./PRD.md) — §8 Shipped · §9 Waves · §12 Codex notes · §13 Success  
- [CODEX_HANDOFF.md](./CODEX_HANDOFF.md) — known v0 bugs + file map  
- [ASSET_BRIEF.md](./ASSET_BRIEF.md)

Play live: https://blockbean-collapse.vercel.app
