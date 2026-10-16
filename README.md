# 方块豆人：塌了就出局 — BlockBean Collapse

**体素塌陷淘汰赛** — Minecraft 手感 × Fall Guys 乱斗氛围的原创 IP（非官方联动）。

**Play：** https://blockbean-collapse.vercel.app

![Key art](./concept/blockbean_keyart.jpg)

## 一句话

站在方块上、推开对手、地块塌了就出局 — 谁最后还站着谁赢。

## Controls / 操作

| 键 | 作用 |
|----|------|
| WASD / 方向键 | 移动 |
| Space | 跳 |
| 鼠标左键 / F | 推人 |

（Wave 2 将加移动端触控。）

## Local run / 本地运行

```bash
npx serve .
```

然后打开提示的本地地址。无需 build。

## Docs

- [PRD.md](./PRD.md) — 产品需求
- [TRIAGE_WAVES.md](./TRIAGE_WAVES.md) — 下一波优先项（Wave 1–3）
- [CODEX_HANDOFF.md](./CODEX_HANDOFF.md) — 给编码 agent 的交接
- [ASSET_BRIEF.md](./ASSET_BRIEF.md) — 资产说明

## License / 版权说明

原创角色与玩法设定（BlockBean / 方块豆人）。**不包含** Minecraft、Fall Guys 或其它第三方 IP 的商标、角色或素材。仅作氛围参考描述。

## Deploy

静态站，Vercel 生产域名：https://blockbean-collapse.vercel.app  
仓库 → Vercel 项目 `blockbean-collapse`，`main` 分支自动部署。
