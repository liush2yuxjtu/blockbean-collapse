# PR webhook routine

Automation: `BlockBean PR verify and preview` (`6ad29c71267c8191bf650cb5ad05635e`).

Trigger configuration accepted on 2026-10-17 (no polling schedule):

```json
{
  "connector_type": "github",
  "webhook_name": "pull_request",
  "params": {
    "repository": "liush2yuxjtu/blockbean-collapse",
    "enable_commit_updates": true,
    "enable_comments": false,
    "enable_reviews": false,
    "only_on_merge": false
  }
}
```

Supported wake-ups: opened, ready_for_review, synchronize, closed. The saved prompt is below. Configured does not mean end-to-end validated: Cloudflare authorization, a deployment and a real webhook run still need evidence.

## Saved prompt

处理 liush2yuxjtu/blockbean-collapse 的每个 GitHub Pull Request webhook，执行仓库 VerifySkill 的 PR Lifecycle / PR Preview surface。只使用 Cloudflare Pages Free；不自动合并，不向 PR 分支提交生成文件，不调用 Tripo 或启用付费资源。

事件是唤醒信号。先用 GitHub 连接器重新读取该 PR 的最新 state、merged、head.sha、base.ref、merge_commit_sha、merged_at，以及现有 verification 评论；以最新事实为准，过期事件不得覆盖较新结果。所有目标分支必须为 main。
- opened、ready_for_review、synchronize：为 PR 当前 head SHA 建立独立静态 preview，生命周期状态保持 OPEN_PENDING。
- closed 且 merged=false：记录 CLOSED_UNMERGED，不误报为代码失败。
- closed 且 merged=true：用 PR 详情确认 merge_commit_sha，并通过 GitHub compare merge_sha...main 确认 status 为 ahead 或 identical 且 behind_by=0；为该 merge SHA 建立合并后的独立 preview。

从受信任 main 读取 VerifySkill 和部署脚本，在独立临时 worktree 检出精确 source_sha（open=head_sha，merged=merge_sha）；不要把 main 当前 tip 冒充历史 merge_sha，也不要在持有部署密钥的进程中执行 PR 提供的脚本。用 scripts/prepare-preview.mjs --root <source worktree> 生成静态文件及 build-info.json；通过仓库 Cloudflare direct-upload 脚本部署。若该脚本尚未在 main、Cloudflare 未授权、runner 没有持久化凭据或浏览器不可用，保留已完成证据并明确 BLOCKED，不用其他平台 URL 替代。

每个部署保存 API/CLI 真实返回的 immutable URL、deployment id 和 pr-<number> alias。build-info 必须匹配 pr_number、head_sha、merge_sha 和 source_sha；deployment id 以部署返回值为准，不能伪造或由别名猜测。使用 verify-pr-preview.mjs 在真实页面点击 Start，确认 HTTP 2xx、游戏到达 count/play、0 page error 和 console error，保存 screenshot 与 results.json。HTTP 可达不等于可玩。

先查现有 marker <!-- blockbean-verify:v1:pr-N --> 的记录。稳定事件键为 repo#PR|action|head_sha|merge_sha；deployment id 是结果字段。对已完成相同 source_sha 的有效部署复用，不重复部署；重复成功事件跳过，BLOCKED/FAIL 保留证据并允许补齐缺失步骤。发布前重新读取 PR head/state，防止旧事件覆盖新结果。

只新增或更新该 PR 的一条 verification 评论，包含生命周期、合并进 main 的证据、alias、immutable URL、deployment id、browser smoke、verified_at、verdict、阻塞及下一步。评论同时保留紧凑 JSON 证据和 event_key；本次用户已授权该回写。评论写入失败则保留结果并报告 BLOCKED。不要创建无关评论或修改代码。

最终 verdict：PASS 只用于 merged=true、main 包含 merge_sha、部署身份匹配且浏览器可玩检查全部通过；OPEN_PENDING 表示尚未合并，可另外报告 preview smoke PASS；CLOSED_UNMERGED 表示关闭未合并；FAIL 表示实际验证不通过；BLOCKED 表示身份/API/部署/浏览器边界缺失。不能把一个子检查 PASS 报成整个 PR 验收通过。

