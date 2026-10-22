# VLA-Agent-MemoryBench · 任务视频矩阵

纯原生 HTML / CSS / JavaScript，无构建步骤、无后端、无 CDN。左侧选择任务，右侧以 **harness 为列、模型为行** 展示视频。点击任何方格可查看大尺寸视频、tokens 和价格，缺少视频的方格也可打开详情。

> **当前全部为示例数据（demo），待替换。没有附带真实任务视频；tokens、价格和轮数仅为占位演示，不是真实实验结果。任务、harness、模型示例清单并非已确认的完整实验清单。全部替换为真实记录后，在 `data.js` 中将 `demo` 改为 `false` 即可统一关闭示例标签，不用修改页面代码；同时删除各记录描述 / note 中的示例说明。不要在仍有占位数值时关闭提示。**

## 1. 本地预览

直接双击根目录 `index.html`，浏览器使用 `file://` 打开即可，断网也能浏览。数据通过普通脚本 `data.js` 挂载到 `window.BENCH_DATA`，**没有 fetch 请求**。

也可在项目目录启动任意静态服务器：

```bash
cd ~/workspace/vla-memorybench-rollouts
python3 -m http.server 8000
```

浏览器打开 `http://localhost:8000`。当前任务保存在地址的 `#task=cover_blocks` 中，刷新、前进后退或分享地址均可恢复任务；也支持初始地址使用 `?task=cover_blocks`。本地文件链接仅对拥有相同文件位置的人有效，对外分享需先部署静态目录。

左侧可搜索任务，点击“展开 / 收起”可折叠列表。窄屏任务列表移到上方，矩阵内部可左右滚动。点击方格打开弹窗，通过右上角关闭、点击遮罩或 Esc 退出。

## 2. 导入一段视频（三步）

1. 创建对应任务目录，把视频放进 `videos/<任务id>/`，例如 `videos/cover_blocks/stirrup__deepseek-v4.1-flash.mp4`。推荐浏览器支持的 H.264 MP4；不要只修改不兼容文件的后缀。
2. 编辑 **唯一数据文件 `data.js`**：找到 `results.cover_blocks["deepseek-v4.1-flash"].stirrup`，填写 `video` 相对路径，以及真实提供的 tokens、价格、币种；没有的字段删除或留空，不要猜测。
3. 保存后刷新页面，点击对应方格播放视频并检查详情。

以下只是结构和占位数值演示（demo），不是实测数据：

```js
stirrup: {
  video: "videos/cover_blocks/stirrup__deepseek-v4.1-flash.mp4",
  totalTokens: 14400,
  cost: "0.0120",
  currency: "USD",
  note: "示例数据（demo），待替换。"
}
```

只填总 tokens 时，弹窗只显示总数，不会自动拆分或推算。数值 `0` 会正常显示。若文件不存在或编码不可播放，将显示路径/编码提示，不保留坏播放器。可选封面加载失败时会自动移除。

### 导入一个 pair（当前数据格式）

每个任务下有多个 pair，每个 pair 有 `history_0`、`history_1` 两组数据（每组是一次运行，即一个 case）。方格内可切换 pair 和 history，详情里有该 case 的成功/失败。

1. 输入图放进 `images/<任务id>/`，建议命名 `<pair id>_input.png`（如 `images/cover_blocks/pair_003_input.png`；demo 里用的是同名 svg 占位图，真实图用 png/jpg）。两组 history 共享同一张当前输入图时，填在 pair 的 `inputImage` 上；若某一组有自己的输入图，填该组 branch 的 `image`，它优先显示。
2. 输出视频放进 `videos/<任务id>/`，建议命名 `<harness id>__<model id>__<pair id>__history_0.mp4`。
3. 在 `data.js` 对应方格的 `pairs` 数组里加一条 pair：`history_0`、`history_1` 两个键都要有（没数据写 `{}`），每组填 `video`、`success`（`true` 成功 / `false` 失败 / 不填 = 未知，只能填 true/false）、tokens 与价格。
4. 刷新页面，在方格内切换到这个 pair 检查输入图、视频、成功/失败徽标与弹窗详情。

> 批量导入前可用 `tools/import_prep.py` 预检：它会核对视频/输入图的文件名、查体积（对照 GitHub 100MB / 25MB 两条线）、
> 按 pair 检查缺件，并直接生成可粘贴进 `data.js` 的 pairs 片段。用法：
> `python3 tools/import_prep.py <暂存目录> --task cover_blocks [--success-map success.csv]`。
> `success.csv` 无表头，每行 `pair_id,history,true|false`；不提供时片段里 success 写 `null`（页面显示"结果待导入"），脚本不会自行推断成功失败。

## 3. 新增任务 / harness / 模型

所有改动都只涉及 `data.js`，不需要改 HTML 或页面逻辑：

- **新增任务**：在 `tasks` 数组加入 `{ id: "your_task", name: "your_task", description: "任务说明" }`。任务 id 使用唯一蛇形命名。在 `results.your_task` 下按模型 id → harness id 填写记录，视频放进 `videos/your_task/`。无需先填完全部组合。
- **新增 harness**：在 `harnesses` 数组加入 `{ id: "your-harness", name: "Your Harness" }`，数组顺序决定列顺序；在对应模型下添加 `"your-harness": { ... }` 结果。
- **新增模型**：在 `models` 数组加入 `{ id: "your-model", name: "Your Model" }`，数组顺序决定行顺序；在对应任务下添加 `"your-model": { "your-harness": { ... } }`。
- **删除或改名**：显示名称只改 `name`；修改或删除 `id` 时，同步修改 `results` 的键以及视频路径，避免悬空引用。各数组内的 id 不能重复。
- **调整顺序**：移动三个数组中的条目即可。`tasks` 第一项为默认任务；有效地址中的 task 参数优先。

`results` 定位结构：

```text
results
└── taskId                 ← tasks 中的 id
    └── modelId            ← models 中的 id
        └── harnessId      ← harnesses 中的 id
            └── result     ← video / tokens / cost 等
```

未填写的组合、`{}` 或未填写任何结果的任务都有空状态。三个数组为空时也会有明确提示。模型和 harness 名称仅为可编辑标签，页面不会请求任何模型接口或计算费用。

## 4. 字段说明

| 位置 / 字段 | 含义 | 是否必填 |
| --- | --- | --- |
| `demo` | 整份数据是否为示例；默认 `true`，全部替换后可设为 `false` | 建议保留 |
| `tasks` | 任务数组，控制列表顺序 | 必需，可为空数组 |
| `tasks[].id` | 唯一蛇形任务标识，供结果定位和 URL 使用 | 是 |
| `tasks[].name` | 任务显示名称 | 是 |
| `tasks[].description` | 右侧任务副标题 | 否 |
| `harnesses` | harness 数组，控制矩阵列顺序 | 必需，可为空数组 |
| `models` | 模型数组，控制矩阵行顺序 | 必需，可为空数组 |
| `harnesses[].id` / `models[].id` | 各数组内唯一的标识，与结果的键一致 | 是 |
| `harnesses[].name` / `models[].name` | 显示名称 | 是 |
| `results` | 按任务 → 模型 → harness 嵌套的记录对象 | 可用 `{}`，允许省略组合 |
| `result.pairs` | 该方格的 pair 数组；不写 pairs 时 result 本身按旧格式单条记录渲染（向后兼容） | 否 |
| `pair.id` | pair 标识，如 `pair_000` | 用 pairs 时必填 |
| `pair.inputImage` | pair 级输入图相对路径（两组 history 共享），如 `images/cover_blocks/pair_000_input.png` | 否 |
| `pair.history_0` / `pair.history_1` | 两组数据（branch），没数据写 `{}` | 用 pairs 时两个键都要有 |
| `branch.image` | 该组自己的输入图；填了优先于 `pair.inputImage` | 否 |
| `branch.success` | 该 case 结果：`true` 成功、`false` 失败、不填 = 未知；只能填 true/false | 否 |
| `result.video`（branch.video） | 视频相对路径，例如 `videos/cover_blocks/stirrup__deepseek-v4.1-flash__pair_000__history_0.mp4` | 否；省略或 `""` 显示待导入 |
| `result.poster` | 封面图片相对路径 | 否；省略则预加载视频元数据/首帧 |
| `result.inputTokens` | 输入 tokens，非负数字 | 否 |
| `result.outputTokens` | 输出 tokens，非负数字 | 否 |
| `result.totalTokens` | 总 tokens，非负数字；按所填原值显示 | 否，不自动求和 |
| `result.cost` | 金额，数字或字符串；用字符串可保留小数位 | 否，省略显示待导入 |
| `result.currency` | 币种原文，例如 `USD` / `CNY` | 有金额时建议填写；不自动换汇 |
| `result.rounds` | 执行轮数 | 否 |
| `result.note` | 该条记录的补充说明 | 否 |

使用相对路径，不要填写本机绝对路径或外部 URL。路径、文件名大小写应一致。`data.js` 是 JavaScript 文件：字符串需加引号，有连字符的对象键需加引号；不要删除 `window.BENCH_DATA =`。页面不上传视频或统计数据，媒体仅按填写路径由浏览器读取。

## 5. 文件与自检

- `index.html`：页面结构和弹窗入口。
- `styles.css`：浅色学术风格、矩阵、移动端适配。
- `app.js`：搜索、任务链接、矩阵生成、弹窗与视频错误回退。
- `data.js`：唯一数据入口，顶部有中文 schema 注释。
- `videos/`：视频与可选封面；目录内 `README.txt` 提供路径约定。
- `images/`：pair 的输入图，按任务分子文件夹；当前只有 cover_blocks 的 3 张 svg 示例占位图。

编辑后可检查脚本语法：

```bash
node --check app.js
node --check data.js
```

真实实验导入前，请确认全部 demo 数值已删除或替换、币种与计价记录准确，并逐一检查视频可播放。
## Pair 与 History 数据导入

每个任务、模型和 harness 的组合可以包含多个 Pair。Pair 表示一条成对比较记录，包含共享输入图片，以及 `history_0` 和 `history_1` 两个分支。矩阵方格可直接切换 Pair 与 History；打开详情后也能切换，并查看当前分支的结果、tokens、价格、轮数和备注，以及两组 History 的成功/失败对照。

导入一个 Pair 的步骤：

1. 将输入图片放入站点目录，例如 `images/cover_blocks/pair_003_input.svg`。图片路径使用相对路径。
2. 在 `data.js` 的 `results[taskId][modelId][harnessId].pairs` 数组中新增 Pair 对象。
3. 设置唯一的 `id`，填写共享输入图片路径，并且同时提供 `history_0` 与 `history_1`。某个分支尚无数据时写 `{}`。
4. 在已有分支中按需补充视频、结果状态、tokens、价格、币种、轮数与备注。视频和封面也使用相对路径；视频未导入时可填 `video: ""`。
5. 保存后在浏览器打开页面。若 Pair 没有图片、视频文件缺失或视频无法解码，页面会显示占位内容。

字段说明：

- `id`：Pair 标识，例如 `"pair_003"`。
- `inputImage`：Pair 共享的输入图路径，可省略。分支的 `image` 字段若存在，会优先用于该 History。
- `note`：Pair 级备注，可省略；分支也可以有自己的 `note`。
- `history_0`、`history_1`：必须同时存在。每个分支都可填写 `image`、`video`、`poster`、`success`、`inputTokens`、`outputTokens`、`totalTokens`、`cost`、`currency`、`rounds` 和 `note`。
- `success`：仅使用 `true` 或 `false`；省略或填 `null` 时显示“未知”。页面不会从视频或其他字段推断结果。
- Tokens：字段可分别省略。只填 `totalTokens` 时页面只显示总数，不会补造输入或输出拆分。
- `cost` 与 `currency`：价格和可选币种；只填写价格而没有币种时，详情会标明币种待导入。
- `rounds`：可选执行轮数。
- `video` 与 `poster`：可选的相对路径。无视频或加载失败时页面会显示提示，不会留下坏播放器。

没有 `pairs`、而是直接在组合对象上填写旧版 `video`、tokens 或 `success` 等字段的数据仍可显示为单条兼容记录。新数据建议统一使用 Pair 结构。
