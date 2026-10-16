# BlockBean Collapse — ASSET_BRIEF (Tripo image-gen ready)

**Project:** 方块豆人：塌了就出局 / BlockBean Collapse  
**Path:** `/workspace/gallery/tripo/blockbean-collapse/`  
**Rule:** Original IP only — no Creeper, no Fall Guys bean, no 蛋仔 trademarks.  
**Do NOT call Tripo or spend credits until user green-lights image gen.**

---

## Asset count: **8** (Wave 1: 4 · Wave 3: +4)

| # | Filename stem | Role | Est. Tripo points (rough) |
|---|---------------|------|---------------------------|
| 1 | `hero_blockbean_tpose` | Hero playable, T-pose | 25–40 |
| 2 | `rival_blockbean_tint` | Rival / bot recolor, T-pose | 25–40 |
| 3 | `voxel_tile_crumble` | Arena tile + collapse look | 20–35 |
| 4 | `hazard_prop_spikebox` | Hazard knock prop | 20–35 |
| | **Total** | | **~90–150** (target band; confirm if >200) |

*Rough estimate assumes 1 multiview (or image-to-model) pass per asset. Extra refine / texture passes can push toward 150–200 — confirm before spending.*

---

## Shared style bible（全资产统一）

- Style: **cute stylized voxel / soft-toy plastic**, clean PBR-friendly, game-ready silhouette  
- Lighting for sheets: **studio softbox, neutral gray seamless backdrop**, no busy environment  
- Camera for character sheets: **orthographic-friendly**, full body in frame, small margin  
- Negative (always): Creeper face, Fall Guys bean shape, 蛋仔 logo/costume, Minecraft grass block atlas, real person, watermark, text logo, NSFW  

---

## 1. Hero BlockBean — T-pose front / side sheets

**ID:** `hero_blockbean_tpose`  
**Use:** Tripo multiview / image-to-model → hero GLB  

### Character design lock
- Body: **rounded cube torso** (方块豆) + short stubby limbs (soft cylinders), friendly face (dot eyes + small smile), **no brand marks**  
- Palette: **sky blue torso**, cream limbs, soft black eyes  
- Pose: **strict T-pose**, feet flat, arms horizontal, fingers simple mittens  

### Prompt — Front sheet (CN)
```
游戏角色设定图，正面全身，严格T姿势，原创方块豆人：圆角方块身体，短粗四肢，天空蓝躯干，奶油色手脚，圆点黑眼睛，微笑，软玩具塑料质感，干净剪影，中性灰色无缝背景，柔和棚拍灯光，无文字无水印，适合3D建模多视图参考
```

### Prompt — Front sheet (EN)
```
Game character turnaround sheet, full-body FRONT view, strict T-pose, original cube-bean avatar: rounded cube torso, stubby soft limbs, sky-blue body, cream hands and feet, simple dot eyes and smile, soft-toy plastic material, clean silhouette, neutral gray seamless studio backdrop, softbox lighting, no text, no watermark, Tripo multiview ready, original IP only
```

### Prompt — Side sheet (CN)
```
同一角色侧面全身设定图，严格T姿势，原创方块豆人圆角方块躯干短肢，天空蓝加奶油色，侧面可见耳朵或发丝可选无，中性灰背景棚拍，与正面一致比例，无文字无水印
```

### Prompt — Side sheet (EN)
```
Same character SIDE full-body sheet, strict T-pose, original cube-bean, rounded cube torso stubby limbs, sky-blue and cream palette, matching proportions to front sheet, neutral gray studio backdrop, softbox, no text no watermark, multiview consistent
```

### Optional 3/4 key art (hero only, marketing)
```
CN: 方块豆人胜利姿势站在摇晃的体素平台边缘，下方虚空，明亮卡通渲染，竖版短视频封面构图，无商标
EN: Original cube-bean hero victory pose on a crumbling voxel platform edge above void, bright stylized render, vertical short-video cover framing, no trademarks
```

---

## 2. Rival BlockBean — tint variant T-pose

**ID:** `rival_blockbean_tint`  
**Use:** Bot / rival instances (same mesh topology preferred)  

### Design lock
- **Identical silhouette and proportions** to hero  
- Palette swap only: **coral / warm orange torso**, mint or cream limbs  
- Same T-pose sheet requirements  

### Prompt — Front (CN)
```
游戏角色正面全身T姿势，与方块豆人同款体型剪影，仅换色：珊瑚橙躯干，薄荷或奶油手脚，圆点眼微笑，软玩具质感，灰色棚拍背景，无文字无水印，原创角色
```

### Prompt — Front (EN)
```
Game character FRONT full-body T-pose, identical silhouette to cube-bean hero, recolor only: coral-orange torso, mint or cream limbs, dot eyes smile, soft-toy plastic, gray seamless studio, no text no watermark, original character
```

### Prompt — Side (CN / EN)
Same as hero side prompts, with coral-orange torso callout instead of sky-blue.

---

## 3. Crumbling voxel tile

**ID:** `voxel_tile_crumble`  
**Use:** Arena floor module; collapse / crack VFX reference  

### Design lock
- Single **~1m game cube tile**, slightly rounded edges for style match  
- Visible **crack lines**, small broken corner chips, subtle warn glow (yellow-orange emissive edge OK in key art)  
- Neutral stone / pastel clay material — **not** Minecraft grass-dirt top  

### Prompt — Ortho / product (CN)
```
单个体素平台方块道具，正俯或3/4产品视图，圆角立方体，表面裂纹与崩角碎块，浅灰石或马卡龙粘土材质，边缘可有微弱预警橙光，中性灰背景棚拍，无草方块图案，无商标无文字，适合3D建模
```

### Prompt — Ortho / product (EN)
```
Single crumbling voxel platform tile, product 3/4 or top-down view, rounded cube, surface cracks and chipped corner chunks, light gray stone or pastel clay PBR, optional faint orange warning edge glow, neutral gray studio backdrop, no grass-block pattern, no logos no text, Tripo ready
```

### Prompt — Collapse state (optional second ref)
```
CN: 同一瓷砖正在下坠碎裂，碎片分离，动态但可读，灰背景
EN: Same tile mid-collapse, chunks separating, readable silhouette, gray backdrop
```

---

## 4. Hazard prop — spikebox / warning cube

**ID:** `hazard_prop_spikebox`  
**Use:** Periodic shove / scare prop on arena  

### Design lock
- Original **warning cube** with blunt pyramids / rubber spikes (toy-safe look)  
- Colors: **caution yellow + charcoal**, or magenta accent — **no TNT stamp, no Creeper face**  
- Scale: roughly 0.6–1.0× tile height  

### Prompt (CN)
```
原创危险道具：圆角警示方块，表面钝角橡胶尖刺，黄黑或黄炭灰警戒配色，可爱偏玩具而非写实暴力，产品级3/4视图，灰色棚拍背景，无TNT标识，无苦力怕脸，无商标无文字
```

### Prompt (EN)
```
Original hazard prop: rounded warning cube with blunt rubbery spikes, caution yellow and charcoal palette, cute toy style not gore, product 3/4 view, gray seamless studio, no TNT branding, no Creeper face, no logos no text, Tripo multiview ready
```

---

## Image deliverable checklist (next task — not now)

For each of the 4 assets, prepare before Tripo:

1. Front (or primary) sheet — clean BG  
2. Side or 3/4 matching sheet (characters mandatory; props: 3/4 + top optional)  
3. Save under `/workspace/gallery/tripo/blockbean-collapse/refs/` (create when generating)  
4. Naming: `{id}_front.png`, `{id}_side.png`, `{id}_key.png`  

**Tripo plan (later):** image-to-multiview or multiview-to-model per asset → download GLB → keep gallery-only publish path.

---

## Credit gate

| Band | Action |
|------|--------|
| ≤150 | Proceed when user says go |
| 151–200 | Soft confirm |
| **>200** | **Hard confirm with user before any Tripo call** |

Current rough total for 4 assets: **~90–150 points**.


---

## Wave 3 — Theme tiles + mint unlock skin (shipped 2026-10-17 CST)

**Status:** Generated via Tripo `text_to_model` · model `v2.5-20250123` · texture+pbr · face_limit ~20000  
**PRD locks:** Maps **P2** grass/dirt · **P3** ice/slippery · **P4** night neon · Monetization **N2** streak-unlock skin  
**Credits this batch:** **80** (20×4) · balance after **660** (was ~740) · under the ≤200 gate  
**game.js:** **not wired yet** (Codex later) — assets only.

| # | Repo path | Role | Tripo task id | Credits |
|---|-----------|------|---------------|---------|
| 5 | `assets/tile_grass/model.glb` | P2 theme arena tile (grass green top / dirt brown sides) | `eb85b116-fba8-43cb-a532-05c6475b4564` | 20 |
| 6 | `assets/tile_ice/model.glb` | P3 theme arena tile (icy blue/white) | `82eb6047-f8d0-426e-80d7-5fc4a77d79ea` | 20 |
| 7 | `assets/tile_neon/model.glb` | P4 theme arena tile (dark purple + cyan/magenta neon edges) | `86bb5041-aca5-474c-a447-54939b2cd49b` | 20 |
| 8 | `assets/skin_mint/model.glb` | N2 mint unlock skin T-pose (mint torso + cream limbs) | `52f65497-993c-49d1-a277-65326d2c8a36` | 20 |

Each folder also has `preview.png`. Gallery master copies + raws live under `/workspace/gallery/tripo/blockbean-collapse/assets/`.

## Wave 3 credit gate

The four Wave 3 assets used 80 Tripo credits in total (20 each), below the 200-credit confirmation threshold. No additional Tripo generation is part of this code pass. Existing GLBs remain uncompressed and are wired through selectable theme and starter-skin fallbacks.
