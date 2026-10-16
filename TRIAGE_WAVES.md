# BlockBean Collapse — Triage Waves / 下一波优先项

方块豆人：塌了就出局 — next implementation waves (user approved items 1–10).

**Do not treat this as done until a coding agent implements it.** This file is the backlog.

---

## Role split / 角色分工

| Role | Who | Notes |
|------|-----|-------|
| Coding (physics, juice, AI, UI, perf) | Cloud agent / Codex | Implement Wave 1–2 from this file + `PRD.md` / `CODEX_HANDOFF.md` |
| 3D skins / map variants | Tripo bot | Estimate credits before generate; Wave 3 |
| Iterative bugfix | User Codex | Local playtest → fix loop |

---

## Wave 1 — Play feel + viral（先做）

1. **Physics: edge standing / drop fix, coyote + jump buffer**  
   物理：边缘站立/掉落修正；土狼时间 + 跳跃缓冲。

2. **Juice: push particles, camera punch, clearer collapse warn, out feedback**  
   手感：推人粒子、镜头冲击、更清晰塌陷预警、出局反馈。

3. **Smarter AI: avoid warned tiles, avoid spikebox, push at edges**  
   更聪明 AI：避开预警地块、避开尖刺箱、在边缘推人。

4. **Sudden-death final 2×2 (from PRD)**  
   决胜：最后 2×2 突然死亡（见 PRD）。

5. **Result screen: win/lose, push score, shareable copy + short link**  
   结算屏：胜/负、推人得分、可分享文案 + 短链。

---

## Wave 2 — Reach + polish

6. **InstancedMesh for 64 tiles (perf)**  
   性能：64 地块用 InstancedMesh。

7. **Mobile touch controls**  
   移动端触控。

8. **SFX / BGM for collapse & push**  
   塌陷与推人音效 / BGM。

10. **Spectate switch after elimination (+ optional simple replay later)**  
    出局后观战切换（可选：后续简单回放）。

---

## Wave 3 — Content

9. **More skins / map variants (Tripo credits; estimate before generate)**  
    更多皮肤 / 地图变体（Tripo 额度；生成前先估分）。

---

## Reference docs

- [PRD.md](./PRD.md)
- [CODEX_HANDOFF.md](./CODEX_HANDOFF.md)
- [ASSET_BRIEF.md](./ASSET_BRIEF.md)

Play live: https://blockbean-collapse.vercel.app
