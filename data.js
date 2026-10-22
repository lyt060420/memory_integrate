/*
 * 唯一数据入口：只编辑本文件，再把图片与视频放进项目目录。
 * 本文件全部条目均为「示例数据（demo），待替换」，并非真实实验结果。
 *
 * schema：
 * demo: true 表示整份数据是示例；全部换成真实记录后改为 false，统一关闭 demo 标签。
 * tasks: [{ id, name, description? }]，id 使用唯一蛇形命名，如 cover_blocks。
 * harnesses: [{ id, name }]，数组顺序就是表格列顺序，id 必须唯一。
 * models: [{ id, name }]，数组顺序就是表格行顺序，id 必须唯一。
 * results[taskId][modelId][harnessId] = { pairs: [pair, ...] }。
 * pair: { id, inputImage?, note?, history_0, history_1 }，id 必填；inputImage 是 pair 级共享输入图。
 * branch: { image?, video, poster?, success?, inputTokens?, outputTokens?, totalTokens?,
 *           cost?, currency?, rounds?, note? }。history_0 和 history_1 两个键都必须存在，
 *           没有数据时写 {}。branch.image 是当前组自己的输入图，优先于 pair.inputImage。
 * success 只填 true、false 或省略/null；true 表示成功、false 表示失败，省略/null 表示未知，
 * 页面不会根据其他数据推断结果。
 * 图片、视频与封面只使用相对路径。无图或无视频填 "" 或省略，页面会显示占位内容。
 * inputTokens / outputTokens / totalTokens：非负数字，可分别省略；0 是有效值。
 *   只提供 totalTokens 就只显示总数，页面不会编造拆分或推算总数。
 * cost: 金额（数字或字符串，字符串可保留小数位）；currency: 可选币种，如 "USD" 或 "CNY"。
 * rounds: 可选执行轮数；note: 可选说明。
 * 旧格式兼容：没有 pairs、直接带 video/tokens/success 等字段的 result 会作为一个 legacy Pair 渲染，
 *   旧字段映射到 history_0，history_1 显示为空。
 * 不存在的组合可以直接省略，或写 {}，页面仍显示可点击的空方格。
 * 示例输入图：images/cover_blocks/pair_000_input.svg 等。
 * 推荐视频命名：videos/<任务id>/<harness id>__<model id>__<pair id>__<history>.mp4。
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
              note: "演示搭配：history_0 与 history_1 均成功。",
              history_0: {
                video: "",
                success: true,
                inputTokens: 12000,
                outputTokens: 2400,
                totalTokens: 14400,
                cost: "0.0120",
                currency: "USD",
                rounds: 8
              },
              history_1: {
                video: "",
                success: true,
                inputTokens: 11800,
                outputTokens: 2300,
                totalTokens: 14100,
                cost: "0.0118",
                currency: "USD",
                rounds: 8
              }
            },
            {
              id: "pair_001",
              inputImage: "images/cover_blocks/pair_001_input.svg",
              note: "演示搭配：history_0 成功，history_1 失败。",
              history_0: {
                video: "",
                success: true,
                inputTokens: 13000,
                outputTokens: 2500,
                totalTokens: 15500,
                cost: "0.0132",
                currency: "USD",
                rounds: 9
              },
              history_1: {
                video: "",
                success: false,
                inputTokens: 12800,
                outputTokens: 2700,
                totalTokens: 15500,
                cost: "0.0140",
                currency: "USD",
                rounds: 10
              }
            },
            {
              id: "pair_002",
              inputImage: "images/cover_blocks/pair_002_input.svg",
              note: "演示搭配：history_0 与 history_1 均失败。",
              history_0: {
                video: "",
                success: false,
                inputTokens: 14000,
                outputTokens: 2800,
                totalTokens: 16800,
                cost: "0.0150",
                currency: "USD",
                rounds: 11
              },
              history_1: {
                video: "",
                success: false,
                inputTokens: 13500,
                outputTokens: 2900,
                totalTokens: 16400,
                cost: "0.0152",
                currency: "USD",
                rounds: 12
              }
            }
          ]
        },
        "baseline-harness": {
          pairs: [
            {
              id: "pair_000",
              inputImage: "images/cover_blocks/pair_000_input.svg",
              history_0: {
                totalTokens: 18000,
                cost: "0.0180",
                success: true
              },
              history_1: {
                totalTokens: 18200,
                cost: "0.0182",
                success: false
              }
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
              history_0: {
                video: "",
                success: true,
                inputTokens: 10000,
                outputTokens: 2000,
                totalTokens: 12000,
                cost: "0.0250",
                currency: "USD",
                rounds: 7
              },
              history_1: {}
            }
          ]
        }
      }
    }
  }
};
