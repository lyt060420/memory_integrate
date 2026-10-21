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
  const media = document.getElementById("dialog-media");
  let activeTask = null;
  let previousFocus = null;

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

  // 拒绝外部地址与脚本协议，保持视频及封面为离线可用的相对路径。
  function localAsset(value) {
    if (typeof value !== "string") return "";
    const path = value.trim();
    if (!path || /^(?:[a-z][a-z\d+.-]*:|[/\\])/i.test(path)) return "";
    return path;
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
    models.forEach(model => harnesses.forEach(harness => {
      if (Object.keys(getResult(activeTask.id, model.id, harness.id)).length) entryCount += 1;
    }));
    summary.textContent = `${entryCount} 个${isDemo ? "示例" : "结果"}条目 / ${harnesses.length * models.length} 个组合 · ${harnesses.length} harness × ${models.length} 模型`;
    if (!entryCount) matrix.append(element("p", "empty-results-notice", "此任务暂无结果，以下为空组合；点击方格可查看待导入详情。"));
    const scroll = element("div", "table-scroll");
    scroll.tabIndex = 0;
    scroll.setAttribute("role", "region");
    scroll.setAttribute("aria-label", "任务视频矩阵，窄屏可左右滚动");
    const table = element("table", "rollout-table");
    table.style.minWidth = `${Math.max(640, 182 + harnesses.length * 220)}px`;
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
        const result = getResult(activeTask.id, model.id, harness.id);
        const cell = element("td");
        const button = element("button", "result-cell");
        button.type = "button";
        button.setAttribute("aria-label", `查看 ${activeTask.name || activeTask.id} / ${model.name || model.id} / ${harness.name || harness.id} 的视频、tokens 和价格${isDemo ? "（demo）" : ""}`);
        button.append(createVideo(result));
        const bottom = element("span", "cell-bottom");
        bottom.append(element("span", "cell-status", Object.keys(result).length ? (isDemo ? "示例记录 · DEMO" : "实验记录") : "等待导入"), element("span", "cell-link", "查看详情 ↗"));
        button.append(bottom);
        button.addEventListener("click", () => openResult(model, harness, result));
        cell.append(button);
        row.append(cell);
      });
      body.append(row);
    });
    table.append(caption, head, body);
    scroll.append(table);
    matrix.append(scroll);
  }

  function selectTask(task, updateUrl = false) {
    activeTask = task;
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
    const pair = element("div", "detail-pair");
    pair.append(element("dt", "", label), element("dd", "", value));
    document.getElementById("result-details").append(pair);
  }

  function openResult(model, harness, result) {
    previousFocus = document.activeElement;
    document.getElementById("dialog-title").textContent = activeTask.name || activeTask.id;
    document.getElementById("dialog-subtitle").textContent = `${harness.name || harness.id} / ${model.name || model.id}`;
    media.replaceChildren(createVideo(result, true));
    document.getElementById("result-details").replaceChildren();
    addDetail("任务", activeTask.name || activeTask.id);
    addDetail("Harness", harness.name || harness.id);
    addDetail("模型", model.name || model.id);
    const tokenFields = [["inputTokens", "输入 tokens"], ["outputTokens", "输出 tokens"], ["totalTokens", "总 tokens"]];
    let hasTokens = false;
    tokenFields.forEach(([key, label]) => {
      if (hasValue(result[key])) {
        addDetail(`${label}${isDemo ? " · demo" : ""}`, String(result[key]));
        hasTokens = true;
      }
    });
    if (!hasTokens) addDetail("Tokens", "待导入");
    const cost = hasValue(result.cost) ? `${result.cost}${hasValue(result.currency) ? ` ${result.currency}` : "（币种待导入）"}` : "待导入";
    addDetail(`价格${isDemo ? " · demo" : ""}`, cost);
    if (hasValue(result.rounds)) addDetail(`执行轮数${isDemo ? " · demo" : ""}`, result.rounds);
    const note = document.getElementById("result-note");
    note.hidden = !hasValue(result.note);
    note.textContent = result.note || "";
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
    document.body.classList.remove("modal-open");
    if (previousFocus?.isConnected) previousFocus.focus();
  });
  search.addEventListener("input", renderTaskList);
  window.addEventListener("hashchange", restoreTask);
  window.addEventListener("popstate", restoreTask);
  restoreTask();
})();
