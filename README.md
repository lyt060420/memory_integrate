# VLA-Agent-MemoryBench · 任务视频矩阵（GitHub Pages 站点）

公开页面：https://lyt060420.github.io/memory_integrate/（仓库 `lyt060420/memory_integrate` 的 GitHub Pages 项目站）

左侧选择任务，右侧以 **harness 为列、模型为行** 展示任务视频；点击方格查看大视频、tokens 和价格。

## 怎么更新页面（同步方式）

页面内容全部来自本仓库文件，推送后 GitHub Pages 自动重新发布（约 1 分钟），链接不变：

1. 新视频放进 `videos/<任务id>/`，建议命名 `<harness id>__<model id>.mp4`（如 `videos/cover_blocks/stirrup__deepseek-v4.1-flash.mp4`）。
2. 编辑 `data.js`（唯一数据文件，顶部有中文 schema 注释）：在对应方格填写 `video` 路径、tokens、价格。
3. 提交并推送到 `main` 分支，刷新页面即是最新内容。

注意：视频等二进制大文件不要用聊天里的连接器快照推送（仅支持文本文件），请用本地 git 推送或 GitHub 网页端上传（单个文件网页上传上限 25 MB，git 推送单文件上限 100 MB）。

字段说明与本地预览方法见发布目录同名文档或站点源码 `data.js` 注释。当前页面数据为示例（demo），待替换为真实实验记录；全部替换后把 `data.js` 中 `demo` 改为 `false`。
