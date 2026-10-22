"use strict";

(() => {
  const data = window.BENCH_DATA || {};
  const isDemo = data.demo !== false;
  const demoSuffix = isDemo ? " · DEMO" : "";
  const tasks = Array.isArray(data.tasks) ? data.tasks : [];
  const harnesses = Array.isArray(data.harnesses) ? data.harnesses : [];
  const models = Array.isArray(data.models) ? data.models : [];
  const search = document.getElementById("task-search");
  const taskList = document.getElementById("task-list");
  const matrix = document.getElementById("matrix-container");
  const dialog = document.getElementById("result-dialog");
  const dialogControls = document.getElementById("dialog-controls");
  const media = document.getElementById("dialog-media");
  const HISTORY_KEYS = ["history_0", "history_1"];
  let activeTask = null;
  let previousFocus = null;
  // 每个方格各自的 pair/history 选择：key = taskId|modelId|harnessId；切换任务时清空。
  let cellState = new Map();
  // 弹窗当前查看的方格与选择，弹窗内切换 pair/history 时只重渲染弹窗内容。
  let dialogState = null;

  document.querySelector(".demo-notice").hidden = !isDemo;
  document.querySelector(".demo-badge").hidden = !isDemo;
  document.querySelector(".dialog-demo").hidden = !isDemo;
  document.querySelector(".dialog-header .eyebrow").textContent = `ROLLOUT DETAILS${demoSuffix}`;
  document.querySelector(".page-footer span:last-child").textContent = isDemo
    ? "Task rollouts / 示例预览 · 本地视频导入就绪"
    : "Task rollouts / 本地视频导入就绪";

  // 所有外部数据仅通过 textContent 展示，避免导入文案成为 HTML。
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }

  function emptyState(message, compact = false) {
    const state = element("div", compact ? "empty-state compact" : "empty-state");
    state.append(element("span", "empty-symbol", "▷"), element("span", "", message));
    state.firstChild.setAttribute("aria-hidden", "true");
    return state;
  }

  function getResult(taskId, modelId, harnessId) {
    return data.results?.[taskId]?.[modelId]?.[harnessId] || {};
  }

  function hasValue(value) {
    return value !== undefined && value !== null && value !== "";
  }

  // 拒绝外部地址与脚本协议，保持图片、视频及封面为离线可用的相对路径。
  function localAsset(value) {
    if (typeof value !== "string") return "";
    const path = value.trim();
    if (!path || /^(?:[a-z][a-z\d+.-]*:|[/\\])/i.test(path)) return "";
    return path;
  }

  // 把 result 统一成 pairs 结构；旧格式（没有 pairs、直接是单条 branch）包成 legacy pair 以兼容。
  function getPairs(result) {
    if (Array.isArray(result?.pairs)) return result.pairs;
    if (result && Object.keys(result).length) {
      return [{ id: null, legacy: true, inputImage: result.inputImage || "", history_0: result, history_1: null }];
    }
    return [];
  }

  function branchOf(pair, historyKey) {
    return (pair && pair[historyKey]) || {};
  }

  function inputImageOf(pair, branch) {
    return localAsset(branch?.image) || localAsset(pair?.inputImage);
  }

  function successOf(branch) {
    if (branch?.success === true) return "success";
    if (branch?.success === false) return "failure";
    return "unknown";
  }

  function successText(branch) {
    const s = successOf(branch);
    return s === "success" ? "成功" : s === "failure" ? "失败" : "结果待导入";
  }

  function successBadge(branch) {
    return element("span", `badge ${successOf(branch)}`, successText(branch));
  }

  function stateFor(taskId, modelId, harnessId, pairCount) {
    const key = `${taskId}|${modelId}|${harnessId}`;
    let st = cellState.get(key);
    if (!st) { st = { pairIndex: 0, history: "history_0" }; cellState.set(key, st); }
    if (st.pairIndex >= pairCount) st.pairIndex = Math.max(0, pairCount - 1);
    if (!HISTORY_KEYS.includes(st.history)) st.history = "history_0";
    return st;
  }

  // 输入（图片）区：pair 级共享图或 branch 自带图；无图与加载失败都有占位，不出现裂图。
  function createInputImage(pair, branch, large = false) {
    const wrap = element("div", "media-block");
    wrap.append(element("span", "media-label", "输入 · INPUT"));
    const path = inputImageOf(pair, branch);
    if (!path) { wrap.append(emptyState("输入图片 · 待导入", !large)); return wrap; }
    const holder = element("div", large ? "input-wrapper large" : "input-wrapper");
    const img = element("img");
    img.alt = "输入图片";
    img.addEventListener("error", () => {
      holder.replaceChildren(emptyState("输入图片无法加载 · 请检查路径", !large));
    }, { once: true });
    img.src = path;
    holder.append(img);
    wrap.append(holder);
    return wrap;
  }

  function createVideo(result, large = false) {
    const path = localAsset(result.video);
    if (!path) return emptyState("暂无视频 · 待导入", !large);
    const wrapper = element("div", large ? "video-wrapper large" : "video-wrapper");
    const video = element("video");
    video.controls = large;
    video.muted = !large;
    video.playsInline = true;
    video.preload = "metadata";
    video.setAttribute("aria-label", large ? "任务视频播放器" : "任务视频预览");
    const poster = localAsset(result.poster);
    if (poster) {
      video.poster = poster;
      const image = new Image();
      image.onerror = () => video.removeAttribute("poster");
      image.src = poster;
    }
    video.addEventListener("error", () => {
      video.pause();
      wrapper.replaceChildren(emptyState("视频无法加载 · 请检查文件路径或编码", !large));
    }, { once: true });
    video.src = path;
    wrapper.append(video);
    if (!large) wrapper.append(element("span", "play-overlay", "▷"));
    return wrapper;
  }

  // 输出（视频）区，带标注，与输入区分开。
  function createOutputVideo(branch, large = false) {
    const wrap = element("div", "media-block");
    wrap.append(element("span", "media-label", "输出 · OUTPUT"));
    wrap.append(createVideo(branch, large));
    return wrap;
  }

  // pair 切换条（上一对/下一对 + pair id 与序号）；onChange 回调由方格或弹窗提供。
  function createPairBar(pair, pairIndex, pairCount, onChange) {
    const bar = element("div", "pair-bar");
    const prev = element("button", "pair-nav", "‹");
    prev.type = "button";
    prev.setAttribute("aria-label", "上一个 pair");
    prev.disabled = pairCount <= 1 || pairIndex <= 0;
    prev.addEventListener("click", () => onChange(pairIndex - 1));
    const label = element("span", "pair-label", pair?.id ? `${pair.id} · ${pairIndex + 1}/${pairCount}` : `${pairIndex + 1}/${pairCount}`);
    const next = element("button", "pair-nav", "›");
    next.type = "button";
    next.setAttribute("aria-label", "下一个 pair");
    next.disabled = pairCount <= 1 || pairIndex >= pairCount - 1;
    next.addEventListener("click", () => onChange(pairIndex + 1));
    bar.append(prev, label, next);
    return bar;
  }

  // history_0 / history_1 切换钮；legacy 单条记录不显示（pair.history_1 为 null）。
  function createHistoryTabs(pair, current, onChange) {
    if (!pair || pair.legacy) return null;
    const tabs = element("div", "history-tabs");
    HISTORY_KEYS.forEach(key => {
      const tab = element("button", "history-tab", key);
      tab.type = "button";
      if (key === current) tab.classList.add("active");
      tab.setAttribute("aria-pressed", key === current ? "true" : "false");
      tab.addEventListener("click", () => onChange(key));
      tabs.append(tab);
    });
    return tabs;
  }

  function renderTaskList() {
    const query = search.value.trim().toLowerCase();
    const filtered = tasks.filter(task => `${task.name} ${task.id}`.toLowerCase().includes(query));
    document.getElementById("task-count").textContent = query
      ? `${filtered.length} / ${tasks.length} 个任务${demoSuffix}`
      : `${tasks.length} 个任务${demoSuffix}`;
    taskList.replaceChildren();
    if (!filtered.length) {
      taskList.append(emptyState(tasks.length ? "未找到匹配任务，请尝试其他关键词。" : "暂无任务，请在 data.js 中添加。", true));
      return;
    }
    filtered.forEach(task => {
      const button = element("button", "task-item");
      button.type = "button";
      button.append(element("span", "task-item-name", task.name || task.id), element("span", "task-arrow", "›"));
      if (task.id === activeTask?.id) {
        button.classList.add("selected");
        button.setAttribute("aria-current", "true");
      }
      button.addEventListener("click", () => selectTask(task, true));
      taskList.append(button);
    });
  }

  function renderMatrix() {
    matrix.replaceChildren();
    document.getElementById("task-title").textContent = activeTask ? (activeTask.name || activeTask.id) : "暂无任务";
    document.getElementById("task-description").textContent = activeTask?.description || "选择任务，查看 harness × 模型的视频与用量。";
    const summary = document.getElementById("matrix-summary");
    if (!activeTask || !harnesses.length || !models.length) {
      summary.textContent = "暂无可展示的组合";
      matrix.append(emptyState(!activeTask ? "暂无任务，请在 data.js 的 tasks 中添加。" : "暂无 harness 或模型，请在 data.js 中配置表格行列。"));
      return;
    }
    let entryCount = 0;
    let pairTotal = 0;
    models.forEach(model => harnesses.forEach(harness => {
      const result = getResult(activeTask.id, model.id, harness.id);
      if (Object.keys(result).length) entryCount += 1;
      pairTotal += getPairs(result).filter(p => !p.legacy).length;
    }));
    summary.textContent = `${entryCount} 个${isDemo ? "示例" : "结果"}条目 / ${harnesses.length * models.length} 个组合 · 共 ${pairTotal} 个 pair · ${harnesses.length} harness × ${models.length} 模型`;
    if (!entryCount) matrix.append(element("p", "empty-results-notice", "此任务暂无结果，以下为空组合；点击方格可查看待导入详情。"));
    const scroll = element("div", "table-scroll");
    scroll.tabIndex = 0;
    scroll.setAttribute("role", "region");
    scroll.setAttribute("aria-label", "任务视频矩阵，窄屏可左右滚动");
    const table = element("table", "rollout-table");
    table.style.minWidth = `${Math.max(640, 182 + harnesses.length * 240)}px`;
    const caption = element("caption", "sr-only", `${activeTask.name || activeTask.id}：列为 harness，行为模型。${isDemo ? "所有条目为待替换 demo。" : ""}`);
    const head = element("thead");
    const headRow = element("tr");
    const corner = element("th", "corner-cell");
    corner.scope = "col";
    corner.append(element("span", "corner-label", "模型 / HARNESS"), element("span", "corner-task", activeTask.name || activeTask.id));
    headRow.append(corner);
    harnesses.forEach(harness => {
      const header = element("th", "harness-header");
      header.scope = "col";
      header.append(element("span", "", harness.name || harness.id), element("span", "header-caption", `HARNESS${demoSuffix}`));
      headRow.append(header);
    });
    head.append(headRow);
    const body = element("tbody");
    models.forEach(model => {
      const row = element("tr");
      const label = element("th", "model-header");
      label.scope = "row";
      label.append(element("span", "", model.name || model.id), element("span", "header-caption", `MODEL${demoSuffix}`));
      row.append(label);
      harnesses.forEach(harness => {
        const cell = element("td");
        cell.append(buildCell(model, harness));
        row.append(cell);
      });
      body.append(row);
    });
    table.append(caption, head, body);
    scroll.append(table);
    matrix.append(scroll);
  }

  // 一个方格：pair 切换条 + history 切换钮 +（输入图 / 输出视频）主体（点击开弹窗）+ 底部结果徽标。
  function buildCell(model, harness) {
    const result = getResult(activeTask.id, model.id, harness.id);
    const pairs = getPairs(result);
    const container = element("div", "result-cell");
    if (!pairs.length) {
      const openArea = element("div", "cell-media");
      openArea.setAttribute("role", "button");
      openArea.tabIndex = 0;
      openArea.setAttribute("aria-label", `查看 ${activeTask.name || activeTask.id} / ${model.name || model.id} / ${harness.name || harness.id} 的详情${isDemo ? "（demo）" : ""}`);
      openArea.append(emptyState("暂无数据 · 待导入", true));
      const open = () => openResult(model, harness, { pairIndex: 0, history: "history_0" });
      openArea.addEventListener("click", open);
      openArea.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
      container.append(openArea);
      const bottom = element("span", "cell-bottom");
      bottom.append(element("span", "cell-status", "等待导入"), element("span", "cell-link", "查看详情 ↗"));
      container.append(bottom);
      return container;
    }
    const st = stateFor(activeTask.id, model.id, harness.id, pairs.length);
    const pair = pairs[st.pairIndex];
    const branch = branchOf(pair, st.history);
    if (pairs.length > 1 || pair.id) {
      container.append(createPairBar(pair, st.pairIndex, pairs.length, idx => {
        st.pairIndex = idx;
        renderMatrix();
      }));
    }
    const tabs = createHistoryTabs(pair, st.history, key => {
      st.history = key;
      renderMatrix();
    });
    if (tabs) container.append(tabs);
    const openArea = element("div", "cell-media");
    openArea.setAttribute("role", "button");
    openArea.tabIndex = 0;
    openArea.setAttribute("aria-label", `查看 ${activeTask.name || activeTask.id} / ${model.name || model.id} / ${harness.name || harness.id} / ${pair.id || "单条记录"} / ${st.history} 的视频、tokens 和价格${isDemo ? "（demo）" : ""}`);
    openArea.append(createInputImage(pair, branch), createOutputVideo(branch));
    const open = () => openResult(model, harness, { pairIndex: st.pairIndex, history: st.history });
    openArea.addEventListener("click", open);
    openArea.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    container.append(openArea);
    const bottom = element("span", "cell-bottom");
    const left = element("span", "cell-status");
    left.append(successBadge(branch), document.createTextNode(pair.legacy ? " 单条记录" : ` ${st.history}`));
    bottom.append(left, element("span", "cell-link", "查看详情 ↗"));
    container.append(bottom);
    return container;
  }

  function selectTask(task, updateUrl = false) {
    activeTask = task;
    cellState = new Map();
    if (updateUrl && task) {
      // hash 在 file:// 与静态服务器下均可用，并保留其他查询参数。
      const hash = `#task=${encodeURIComponent(task.id)}`;
      if (window.location.hash !== hash) window.location.hash = hash;
    }
    renderTaskList();
    renderMatrix();
  }

  function restoreTask() {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    const taskId = hash.get("task") || query.get("task");
    selectTask(tasks.find(task => task.id === taskId) || tasks[0] || null);
  }

  function addDetail(label, value) {
    const pairEl = element("div", "detail-pair");
    const dd = element("dd", "");
    if (value instanceof Node) dd.append(value); else dd.textContent = String(value);
    pairEl.append(element("dt", "", label), dd);
    document.getElementById("result-details").append(pairEl);
  }

  function renderDialog() {
    if (!dialogState) return;
    const { model, harness } = dialogState;
    const result = getResult(activeTask.id, model.id, harness.id);
    const pairs = getPairs(result);
    document.getElementById("dialog-title").textContent = activeTask.name || activeTask.id;
    document.getElementById("dialog-subtitle").textContent = `${harness.name || harness.id} / ${model.name || model.id}`;
    dialogControls.replaceChildren();
    media.replaceChildren();
    document.getElementById("result-details").replaceChildren();
    const compare = document.getElementById("result-compare");
    compare.hidden = true;
    compare.replaceChildren();
    const note = document.getElementById("result-note");
    note.hidden = true;
    note.textContent = "";
    if (!pairs.length) {
      media.append(emptyState("暂无数据 · 待导入"));
      addDetail("任务", activeTask.name || activeTask.id);
      addDetail("Harness", harness.name || harness.id);
      addDetail("模型", model.name || model.id);
      addDetail("结果", "待导入");
      return;
    }
    if (dialogState.pairIndex >= pairs.length) dialogState.pairIndex = pairs.length - 1;
    const pair = pairs[dialogState.pairIndex];
    if (pair.legacy) dialogState.history = "history_0";
    const branch = branchOf(pair, dialogState.history);
    if (pairs.length > 1 || pair.id) {
      dialogControls.append(createPairBar(pair, dialogState.pairIndex, pairs.length, idx => {
        dialogState.pairIndex = idx;
        renderDialog();
      }));
    }
    const tabs = createHistoryTabs(pair, dialogState.history, key => {
      dialogState.history = key;
      renderDialog();
    });
    if (tabs) dialogControls.append(tabs);
    media.append(createOutputVideo(branch, true), createInputImage(pair, branch, true));
    addDetail("任务", activeTask.name || activeTask.id);
    addDetail("Harness", harness.name || harness.id);
    addDetail("模型", model.name || model.id);
    if (!pair.legacy) {
      addDetail("Pair", `${pair.id || "—"}（${dialogState.pairIndex + 1}/${pairs.length}）`);
      addDetail("History", dialogState.history);
    }
    addDetail("结果", successBadge(branch));
    const tokenFields = [["inputTokens", "输入 tokens"], ["outputTokens", "输出 tokens"], ["totalTokens", "总 tokens"]];
    let hasTokens = false;
    tokenFields.forEach(([key, label]) => {
      if (hasValue(branch[key])) {
        addDetail(`${label}${isDemo ? " · demo" : ""}`, String(branch[key]));
        hasTokens = true;
      }
    });
    if (!hasTokens) addDetail("Tokens", "待导入");
    const cost = hasValue(branch.cost) ? `${branch.cost}${hasValue(branch.currency) ? ` ${branch.currency}` : "（币种待导入）"}` : "待导入";
    addDetail(`价格${isDemo ? " · demo" : ""}`, cost);
    if (hasValue(branch.rounds)) addDetail(`执行轮数${isDemo ? " · demo" : ""}`, branch.rounds);
    if (!pair.legacy) {
      compare.hidden = false;
      compare.append(
        document.createTextNode("成对对照："),
        document.createTextNode(`history_0 `), successBadge(branchOf(pair, "history_0")),
        document.createTextNode(" · history_1 "), successBadge(branchOf(pair, "history_1"))
      );
    }
    const notes = [pair.note, branch.note].filter(hasValue);
    if (notes.length) {
      note.hidden = false;
      note.textContent = notes.join(" ");
    }
  }

  function openResult(model, harness, selection) {
    previousFocus = document.activeElement;
    dialogState = { model, harness, pairIndex: selection.pairIndex, history: selection.history };
    renderDialog();
    dialog.showModal();
    document.body.classList.add("modal-open");
    document.getElementById("dialog-close").focus();
  }

  document.getElementById("dialog-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  // 原生 dialog 处理 Esc、焦点约束；关闭时停止播放并还原触发方格的焦点。
  dialog.addEventListener("close", () => {
    media.querySelectorAll("video").forEach(video => {
      video.pause();
      video.removeAttribute("src");
      video.load();
    });
    media.replaceChildren();
    dialogState = null;
    document.body.classList.remove("modal-open");
    if (previousFocus?.isConnected) previousFocus.focus();
  });
  search.addEventListener("input", renderTaskList);
  window.addEventListener("hashchange", restoreTask);
  window.addEventListener("popstate", restoreTask);
  restoreTask();
})();
