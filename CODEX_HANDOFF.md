# CODEX HANDOFF — BlockBean Collapse v0
Folder: `/workspace/gallery/tripo/blockbean-collapse/` (only edit here). Serve: static, gallery root `/workspace/gallery` on :8900. URL `/tripo/blockbean-collapse/`.

## File map
- `index.html` — splash (keyart), importmap three@0.160.0 (unpkg), loads `game.js`.
- `game.js` — asset loading + `fit()` normalize, `reset()` round setup, `control()` input/AI/push, `physics()` gravity + tile ground + bean separation, `loop()` tiles crack/fall, spikebox, win check, camera, HUD. Debug: `window.__game`.
- `assets/{hero,rival,tile,spikebox}/model.glb` (2–4.5 MB each; tile is cloned 64×).

## Known issues（已知问题）
1. 物理是手写 AABB（未用 cannon-es）：站在方块边缘时只判断中心点所在格子，会"悬空站立"或提前掉落。Repro: walk to tile edge next to a gap.
2. 方块 GLB 的顶面高度用包围盒对齐，模型若不平整，豆人可能陷入/浮空。
3. Rival 染色直接覆盖 material.color，带贴图时颜色可能偏暗/怪。
4. AI 很笨：随机选附近安全格，常一起挤下去；不会躲尖刺箱。
5. 推（E）只有缩放反馈，无动画/音效/粒子；玩家掉落后只能观战，没有观战切换。
6. 64 个 tile clone 每个复制材质 → 绘制调用多，低端机掉帧（可用 InstancedMesh）。
7. 首次加载 ~12 MB GLB，没有进度条；无移动端触控。
8. 计时结束得分规则简单（存活+10，推人+1，仅玩家计分推人分）。
9. 未做 sudden-death（PRD 中最后 2×2 加剧抖动）。

## Acceptance checks
- `curl -o /dev/null -w '%{http_code}' https://resume-box.tail6a877d.ts.net/tripo/blockbean-collapse/` → 200
- 点击开始 → 倒计时 3-2-1 → WASD 可移动、Space 跳、E 推开近距离 bot
- 60s 内平台逐步变红坠落；掉出 y<-15 判出局；最后一人/计时结束显示胜者，R 重开
- 删除/改名任一 model.glb 后游戏仍可运行（方块替代）
- Console 无报错；60fps on desktop
