/*
 * 唯一数据入口：只编辑本文件，再把视频放进 videos/，无需修改页面代码。
 * 本文件全部条目均为「示例数据（demo），待替换」，并非真实实验结果。
 *
 * schema：
 * demo: true 表示整份数据是示例；全部换成真实记录后改为 false，统一关闭 demo 标签。
 * tasks: [{ id, name, description? }]，id 使用唯一蛇形命名，如 cover_blocks。
 * harnesses: [{ id, name }]，数组顺序就是表格列顺序，id 必须唯一。
 * models: [{ id, name }]，数组顺序就是表格行顺序，id 必须唯一。
 * results: { [taskId]: { [modelId]: { [harnessId]: result } } }。
 * result 字段：
 *   video: 视频相对路径；无视频填 "" 或省略，不会生成坏播放器。
 *   poster: 可选封面相对路径；省略则由视频预加载首帧，错误封面会自动移除。
 *   inputTokens / outputTokens / totalTokens: 非负数字，可分别省略；0 是有效值。
 *     只提供 totalTokens 就只显示总数，页面不会编造拆分或推算总数。
 *   cost: 金额（数字或字符串，字符串可保留小数位），不填显示「待导入」。
 *   currency: 币种，如 "USD" 或 "CNY"；按原文展示，不自动换汇或补默认币种。
 *   rounds: 可选轮数；note: 可选说明。
 * 不存在的组合可以直接省略，或写 {}，页面仍显示可点击的空方格。
 * 推荐视频命名：videos/<任务id>/<harness id>__<model id>.mp4。
 * 例如：videos/cover_blocks/stirrup__deepseek-v4.1-flash.mp4。
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
        stirrup: { video: "", inputTokens: 12000, outputTokens: 2400, totalTokens: 14400, cost: "0.0120", currency: "USD", rounds: 8, note: "示例数据（demo），待替换。此处数值仅为占位，不是真实测量；项目 baseline 配置为 High。" },
        "baseline-harness": { video: "", totalTokens: 18000, cost: "0.0180", currency: "USD", note: "示例数据（demo），待替换。仅填写总 tokens，未提供输入/输出拆分。" }
      },
      "gpt-6-astra": {
        stirrup: { video: "", inputTokens: 10000, outputTokens: 2000, totalTokens: 12000, cost: "0.0250", currency: "USD", note: "示例数据（demo），待替换。模型名称与数值仅作项目语境下的界面占位。" }
      }
    }
  }
};
