/*
 * 唯一数据入口：只编辑本文件，再把图片放进 images/、视频放进 videos/，无需修改页面代码。
 * 本文件全部条目均为「示例数据（demo），待替换」，并非真实实验结果。
 *
 * schema：
 * demo: true 表示整份数据是示例；全部换成真实记录后改为 false，统一关闭 demo 标签。
 * tasks: [{ id, name, description? }]，id 使用唯一蛇形命名，如 cover_blocks。
 * harnesses: [{ id, name }]，数组顺序就是表格列顺序，id 必须唯一。
 * models: [{ id, name }]，数组顺序就是表格行顺序，id 必须唯一。
 * results: { [taskId]: { [modelId]: { [harnessId]: result } } }。
 *
 * result（新格式，以 pair 为单位）：
 *   pairs: [pair, ...]，一个任务下可以有多个 pair，方格内可逐个切换。
 *   pair = {
 *     id: "pair_000"，必填，pair 标识；
 *     inputImage: pair 级输入图相对路径（history_0 与 history_1 共享的当前输入图），可选；
 *     note: 可选说明；
 *     history_0: branch, history_1: branch   // 两个键都要有，没有数据可写 {}
 *   }
 *   branch（一组 history 下的一次运行，即一个 case）字段：
 *     image: 可选；该组自己的输入图，填了优先于 pair.inputImage 显示。
 *     video: 输出视频相对路径；无视频填 "" 或省略，不会生成坏播放器。
 *     poster: 可选封面相对路径。
 *     success: true = 成功，false = 失败，省略或 null = 结果未知；只能填 true/false，不许用文字代替，页面不会自行推断。
 *     inputTokens / outputTokens / totalTokens: 非负数字，可分别省略；0 是有效值。
 *       只提供 totalTokens 就只显示总数，页面不会编造拆分或推算总数。
 *     cost: 金额（数字或字符串，字符串可保留小数位），不填显示「待导入」。
 *     currency: 币种，如 "USD" 或 "CNY"；按原文展示，不自动换汇或补默认币种。
 *     rounds: 可选轮数；note: 可选说明。
 *
 * 向后兼容：result 也可以不写 pairs、直接写成旧格式的单条 branch 字段
 *   （video / success / inputTokens ...），页面会当作单条记录渲染。
 * 不存在的组合可以直接省略，页面仍显示可点击的空方格。
 *
 * 文件命名建议：
 *   输入图：images/<任务id>/<pair id>_input.png（真实图用 png/jpg；下方 demo 用的是 svg 占位图）
 *   输出视频：videos/<任务id>/<harness id>__<model id>__<pair id>__history_0.mp4
 * 使用浏览器可解码的视频编码（推荐 H.264 MP4）；路径区分大小写。
 * 新增数据时确保 results 内所有 id 都来自上面三个数组，勿留悬空引用。
 */
window.BENCH_DATA = {
  demo: true,
  tasks: [
    { id: "cover_blocks", name: "cover_blocks", description: "视觉记忆任务 · 当前主任务。示例数据（demo），视频与真实用量待导入。" },
    { id: "classify_objects", name: "classify_objects", description: "示例任务（demo）· 待导入项目视频与实验记录。" },
    { id: "imitate_sorting_sequence", name: "imitate_sorting_sequence", description: "示例任务（demo）· 待导入项目视频与实验记录。" },
    { id: "match_and_pick_from_conveyor", name: "match_and_pick_from_conveyor", description: "示例任务（demo）· 待导入项目视频与实验记录。" },
    { id: "organize_table", name: "organize_table", description: "示例任务（demo）· 待导入项目视频与实验记录。" }
  ],
  harnesses: [
    { id: "stirrup", name: "Stirrup" },
    { id: "baseline-harness", name: "Baseline Harness" }
  ],
  models: [
    { id: "deepseek-v4.1-flash", name: "DeepSeek v4.1 Flash" },
    { id: "gpt-6-astra", name: "GPT-6 Astra" },
    { id: "grok-4.6", name: "Grok 4.6" }
  ],
  results: {
    cover_blocks: {
      "deepseek-v4.1-flash": {
        stirrup: {
          pairs: [
            {
              id: "pair_000",
              inputImage: "images/cover_blocks/pair_000_input.svg",
              note: "示例 pair（demo）：演示两组 history 都成功的搭配。",
              history_0: { video: "", success: true, inputTokens: 12000, outputTokens: 2400, totalTokens: 14400, cost: "0.0120", currency: "USD", rounds: 8, note: "示例数据（demo），待替换。此处数值仅为占位，不是真实测量；项目 baseline 配置为 High。" },
              history_1: { video: "", success: true, inputTokens: 11800, outputTokens: 2350, totalTokens: 14150, cost: "0.0118", currency: "USD", rounds: 8, note: "示例数据（demo），待替换。" }
            },
            {
              id: "pair_001",
              inputImage: "images/cover_blocks/pair_001_input.svg",
              note: "示例 pair（demo）：演示 history_0 成功、history_1 失败的成对差异。",
              history_0: { video: "", success: true, inputTokens: 12100, outputTokens: 2380, totalTokens: 14480, cost: "0.0121", currency: "USD", rounds: 8, note: "示例数据（demo），待替换。" },
              history_1: { video: "", success: false, inputTokens: 12300, outputTokens: 2410, totalTokens: 14710, cost: "0.0123", currency: "USD", rounds: 8, note: "示例数据（demo），待替换。" }
            },
            {
              id: "pair_002",
              inputImage: "images/cover_blocks/pair_002_input.svg",
              note: "示例 pair（demo）：演示两组 history 都失败的搭配。",
              history_0: { video: "", success: false, inputTokens: 11900, outputTokens: 2300, totalTokens: 14200, cost: "0.0119", currency: "USD", rounds: 8, note: "示例数据（demo），待替换。" },
              history_1: { video: "", success: false, inputTokens: 12050, outputTokens: 2360, totalTokens: 14410, cost: "0.0120", currency: "USD", rounds: 8, note: "示例数据（demo），待替换。" }
            }
          ]
        },
        "baseline-harness": {
          pairs: [
            {
              id: "pair_000",
              inputImage: "images/cover_blocks/pair_000_input.svg",
              note: "示例 pair（demo）：两个 branch 都只填写总 tokens，演示不编造拆分。",
              history_0: { video: "", success: true, totalTokens: 18000, cost: "0.0180", currency: "USD", note: "示例数据（demo），待替换。仅填写总 tokens，未提供输入/输出拆分。" },
              history_1: { video: "", success: false, totalTokens: 17600, cost: "0.0176", currency: "USD", note: "示例数据（demo），待替换。仅填写总 tokens。" }
            }
          ]
        }
      },
      "gpt-6-astra": {
        stirrup: {
          pairs: [
            {
              id: "pair_000",
              inputImage: "images/cover_blocks/pair_000_input.svg",
              note: "示例 pair（demo）：history_1 留空，演示结果待导入状态。",
              history_0: { video: "", success: true, inputTokens: 10000, outputTokens: 2000, totalTokens: 12000, cost: "0.0250", currency: "USD", note: "示例数据（demo），待替换。模型名称与数值仅作项目语境下的界面占位。" },
              history_1: {}
            }
          ]
        }
      }
    }
  }
};
