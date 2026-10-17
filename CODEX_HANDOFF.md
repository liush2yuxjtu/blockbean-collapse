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
