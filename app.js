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
  const cellStates = new Map();
  let activeTask = null;
  let previousFocus = null;
  let dialogContext = null;

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

  function hasValue(value) {
    return value !== undefined && value !== null && value !== "";
  }

  function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function getResult(taskId, modelId, harnessId) {
    return data.results?.[taskId]?.[modelId]?.[harnessId] || {};
  }

  // 兼容旧版直接存放 video/tokens 等字段的 result。
  function normalizeResult(result) {
    if (!isRecord(result)) return [];

    if (Array.isArray(result.pairs)) {
      return result.pairs.map((source, index) => {
        const pair = isRecord(source) ? source : {};
        return {
          ...pair,
          id: hasValue(pair.id) ? String(pair.id) : `pair_${String(index + 1).padStart(3, "0")}`,
          history_0: isRecord(pair.history_0) ? pair.history_0 : {},
          history_1: isRecord(pair.history_1) ? pair.history_1 : {}
        };
      });
    }

    if (!Object.keys(result).length) return [];
    return [{
      id: "legacy",
      inputImage: result.inputImage,
      note: result.note,
      history_0: result,
      history_1: {}
    }];
  }

  // 拒绝外部地址与脚本协议，保持图片、视频及封面为相对路径。
  function localAsset(value) {
    if (typeof value !== "string") return "";
    const path = value.trim();
    if (!path || /^(?:[a-z][a-z\d+.-]*:|[/\\])/i.test(path)) return "";
    return path;
  }

  function statusInfo(success) {
    if (success === true) return { label: "成功", className: "success" };
    if (success === false) return { label: "失败", className: "failure" };
    return { label: "未知", className: "unknown" };
  }

  function resultBadge(success) {
    const status = statusInfo(success);
    return element("span", `result-badge status-${status.className}`, status.label);
  }

  function createVideo(result, large = false) {
    const path = localAsset(result?.video);
    if (!path) return emptyState("暂无视频 · 待导入", !large);

    const wrapper = element("div", large ? "video-wrapper large" : "video-wrapper");
    const video = element("video");
    video.controls = large;
    video.muted = !large;
    video.playsInline = true;
    video.preload = "metadata";
    video.setAttribute("aria-label", large ? "任务视频播放器" : "任务视频预览");

    const poster = localAsset(result?.poster);
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

  function createInputPanel(pair, branch, large = false) {
    const panel = element("section", "media-panel input-panel");
    panel.append(element("span", "media-label", "输入"));

    const branchImage = localAsset(branch?.image);
    const path = branchImage || localAsset(pair?.inputImage);
    if (!path) {
      panel.append(emptyState("暂无输入图 · 待导入", !large));
      return panel;
    }

    const wrapper = element("div", large ? "image-wrapper large" : "image-wrapper");
    const image = element("img");
    image.alt = `${pair?.id || "当前 Pair"} 输入图片`;
    image.loading = large ? "eager" : "lazy";
    image.decoding = "async";
    image.addEventListener("error", () => {
      wrapper.replaceChildren(emptyState("输入图无法加载 · 请检查文件路径", !large));
    }, { once: true });
    image.src = path;
    wrapper.append(image);
    panel.append(wrapper);
    return panel;
  }

  function createOutputPanel(branch, large = false) {
    const panel = element("section", "media-panel output-panel");
    panel.append(element("span", "media-label", "输出"));
    panel.append(createVideo(branch || {}, large));
    return panel;
  }

  function cellKey(task, model, harness) {
    return JSON.stringify([task?.id, model?.id, harness?.id]);
  }

  function getCellState(task, model, harness) {
    const key = cellKey(task, model, harness);
    if (!cellStates.has(key)) {
      cellStates.set(key, { pairIndex: 0, history: "history_0" });
    }
    const state = cellStates.get(key);
    if (state.history !== "history_0" && state.history !== "history_1") state.history = "history_0";
    return { key, state };
  }

  function selectedPair(pairs, state) {
    if (!pairs.length) return null;
    state.pairIndex = Math.max(0, Math.min(state.pairIndex, pairs.length - 1));
    return pairs[state.pairIndex] || null;
  }

  function selectedBranch(pair, state) {
    return pair && isRecord(pair[state.history]) ? pair[state.history] : {};
  }

  function renderTaskList() {
    const query = search.value.trim().toLowerCase();
    const filtered = tasks.filter(task => `${task.name} ${task.id}`.toLowerCase().includes(query));
    document.getElementById("task-count").textContent = query
      ? `${filtered.length} / ${tasks.length} 个任务${demoSuffix}`
      : `${tasks.length} 个任务${demoSuffix}`;

    taskList.replaceChildren();
    if (!filtered.length) {
      taskList.append(emptyState(tasks.length
        ? "未找到匹配任务，请尝试其他关键词。"
        : "暂无任务，请在 data.js 中添加。", true));
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

  function makeCellControl(label, className, ariaLabel, disabled, model, harness, controlName, action) {
    const button = element("button", className, label);
    button.type = "button";
    button.disabled = Boolean(disabled);
    button.setAttribute("aria-label", ariaLabel);
    button.dataset.modelId = String(model.id);
    button.dataset.harnessId = String(harness.id);
    button.dataset.control = controlName;
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      if (!button.disabled) action();
    });
    return button;
  }

  function renderMatrixAndRestoreControlFocus(model, harness, controlName) {
    renderMatrix();
    const match = Array.from(matrix.querySelectorAll("button[data-control]")).find(button =>
      button.dataset.modelId === String(model.id) &&
      button.dataset.harnessId === String(harness.id) &&
      button.dataset.control === controlName
    );
    if (match) match.focus();
  }

  function createResultCell(model, harness, result) {
    const pairs = normalizeResult(result);
    const { state } = getCellState(activeTask, model, harness);
    const pair = selectedPair(pairs, state);
    const branch = selectedBranch(pair, state);
    const card = element("div", "result-cell");

    const pairControls = element("div", "pair-controls");
    const pairPosition = element("span", "pair-position");
    pairPosition.textContent = pair
      ? `${pair.id} · ${state.pairIndex + 1} / ${pairs.length}`
      : "暂无 Pair · 0 / 0";

    const previousPair = makeCellControl(
      "‹",
      "pair-control-button",
      "上一对 Pair",
      pairs.length < 2 || state.pairIndex <= 0,
      model,
      harness,
      "pair-prev",
      () => {
        state.pairIndex -= 1;
        renderMatrixAndRestoreControlFocus(model, harness, "pair-prev");
      }
    );
    const nextPair = makeCellControl(
      "›",
      "pair-control-button",
      "下一对 Pair",
      pairs.length < 2 || state.pairIndex >= pairs.length - 1,
      model,
      harness,
      "pair-next",
      () => {
        state.pairIndex += 1;
        renderMatrixAndRestoreControlFocus(model, harness, "pair-next");
      }
    );
    pairControls.append(previousPair, pairPosition, nextPair);

    const historyControls = element("div", "branch-controls");
    ["history_0", "history_1"].forEach(history => {
      const button = makeCellControl(
        history,
        `history-toggle${state.history === history ? " selected" : ""}`,
        `切换到 ${history}`,
        !pair,
        model,
        harness,
        history,
        () => {
          state.history = history;
          renderMatrixAndRestoreControlFocus(model, harness, history);
        }
      );
      button.setAttribute("aria-pressed", String(state.history === history));
      historyControls.append(button);
    });

    const main = element("div", "result-main");
    main.tabIndex = 0;
    main.setAttribute("role", "button");
    main.setAttribute(
      "aria-label",
      `查看 ${activeTask.name || activeTask.id} / ${model.name || model.id} / ${harness.name || harness.id} 的 Pair、输入图、输出视频与用量${isDemo ? "（demo）" : ""}`
    );
    main.dataset.modelId = String(model.id);
    main.dataset.harnessId = String(harness.id);

    const mediaGrid = element("div", "cell-media-grid");
    mediaGrid.append(createInputPanel(pair, branch), createOutputPanel(branch));
    main.append(mediaGrid);

    const bottom = element("div", "cell-bottom");
    bottom.append(
      resultBadge(branch.success),
      element("span", "cell-status", pair ? (isDemo ? "示例记录 · DEMO" : "实验记录") : "等待导入"),
      element("span", "cell-link", "查看详情 ↗")
    );
    main.append(bottom);
    main.addEventListener("click", () => openResult(model, harness, pairs, state, main));
    main.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openResult(model, harness, pairs, state, main);
    });

    card.append(pairControls, historyControls, main);
    return card;
  }

  function renderMatrix() {
    matrix.replaceChildren();
    document.getElementById("task-title").textContent = activeTask
      ? (activeTask.name || activeTask.id)
      : "暂无任务";
    document.getElementById("task-description").textContent = activeTask?.description
      || "选择任务，查看 harness × 模型的视频、输入图与用量。";

    const summary = document.getElementById("matrix-summary");
    if (!activeTask || !harnesses.length || !models.length) {
      summary.textContent = "暂无可展示的组合";
      matrix.append(emptyState(!activeTask
        ? "暂无任务，请在 data.js 的 tasks 中添加。"
        : "暂无 harness 或模型，请在 data.js 中配置表格行列。"));
      return;
    }

    let entryCount = 0;
    let pairCount = 0;
    models.forEach(model => harnesses.forEach(harness => {
      const pairs = normalizeResult(getResult(activeTask.id, model.id, harness.id));
      if (pairs.length) {
        entryCount += 1;
        pairCount += pairs.length;
      }
    }));
    summary.textContent = `${entryCount} 个${isDemo ? "示例" : "结果"}组合，${pairCount} 个 Pair / ${harnesses.length * models.length} 个组合 · ${harnesses.length} harness × ${models.length} 模型`;

    if (!entryCount) {
      matrix.append(element("p", "empty-results-notice", "此任务暂无结果，以下为空组合；点击方格可查看待导入详情。"));
    }

    const scroll = element("div", "table-scroll");
    scroll.tabIndex = 0;
    scroll.setAttribute("role", "region");
    scroll.setAttribute("aria-label", "任务视频矩阵，窄屏可左右滚动");

    const table = element("table", "rollout-table");
    table.style.minWidth = `${Math.max(640, 182 + harnesses.length * 220)}px`;
    const caption = element(
      "caption",
      "sr-only",
      `${activeTask.name || activeTask.id}：列为 harness，行为模型。${isDemo ? "所有条目为待替换 demo。" : ""}`
    );

    const head = element("thead");
    const headRow = element("tr");
    const corner = element("th", "corner-cell");
    corner.scope = "col";
    corner.append(
      element("span", "corner-label", "模型 / HARNESS"),
      element("span", "corner-task", activeTask.name || activeTask.id)
    );
    headRow.append(corner);

    harnesses.forEach(harness => {
      const header = element("th", "harness-header");
      header.scope = "col";
      header.append(
        element("span", "", harness.name || harness.id),
        element("span", "header-caption", `HARNESS${demoSuffix}`)
      );
      headRow.append(header);
    });
    head.append(headRow);

    const body = element("tbody");
    models.forEach(model => {
      const row = element("tr");
      const label = element("th", "model-header");
      label.scope = "row";
      label.append(
        element("span", "", model.name || model.id),
        element("span", "header-caption", `MODEL${demoSuffix}`)
      );
      row.append(label);

      harnesses.forEach(harness => {
        const cell = element("td");
        cell.append(createResultCell(
          model,
          harness,
          getResult(activeTask.id, model.id, harness.id)
        ));
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
    // 切换任务后，各方格从第一个 Pair 与 history_0 开始。
    cellStates.clear();
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

  function formatCost(branch) {
    if (!hasValue(branch?.cost)) return "待导入";
    return `${branch.cost}${hasValue(branch.currency) ? ` ${branch.currency}` : "（币种待导入）"}`;
  }

  function currentDialogPair() {
    if (!dialogContext) return null;
    return selectedPair(dialogContext.pairs, dialogContext.state);
  }

  function renderDialog() {
    if (!dialogContext) return;

    const { task, model, harness, pairs, state } = dialogContext;
    const pair = selectedPair(pairs, state);
    const branch = selectedBranch(pair, state);
    const taskName = task.name || task.id;

    document.getElementById("dialog-title").textContent = taskName;
    document.getElementById("dialog-subtitle").textContent =
      `${harness.name || harness.id} / ${model.name || model.id}`;

    const pairPosition = document.getElementById("dialog-pair-position");
    pairPosition.textContent = pair
      ? `${pair.id} · ${state.pairIndex + 1} / ${pairs.length}`
      : "暂无 Pair · 0 / 0";
    document.getElementById("dialog-pair-prev").disabled =
      pairs.length < 2 || state.pairIndex <= 0;
    document.getElementById("dialog-pair-next").disabled =
      pairs.length < 2 || state.pairIndex >= pairs.length - 1;

    ["history_0", "history_1"].forEach(history => {
      const button = document.getElementById(`dialog-${history.replace("_", "-")}`);
      button.disabled = !pair;
      button.classList.toggle("selected", state.history === history);
      button.setAttribute("aria-pressed", String(state.history === history));
    });

    media.replaceChildren(createInputPanel(pair, branch, true), createOutputPanel(branch, true));

    const details = document.getElementById("result-details");
    details.replaceChildren();
    addDetail("任务", taskName);
    addDetail("Harness", harness.name || harness.id);
    addDetail("模型", model.name || model.id);
    addDetail("Pair", pair ? pair.id : "暂无 Pair");
    addDetail("History", state.history);
    addDetail("结果", statusInfo(branch.success).label);

    const tokenFields = [
      ["inputTokens", "输入 tokens"],
      ["outputTokens", "输出 tokens"],
      ["totalTokens", "总 tokens"]
    ];
    let hasTokens = false;
    tokenFields.forEach(([key, label]) => {
      if (hasValue(branch[key])) {
        addDetail(`${label}${isDemo ? " · demo" : ""}`, String(branch[key]));
        hasTokens = true;
      }
    });
    if (!hasTokens) addDetail("Tokens", "待导入");

    addDetail(`价格${isDemo ? " · demo" : ""}`, formatCost(branch));
    addDetail(
      `执行轮数${isDemo ? " · demo" : ""}`,
      hasValue(branch.rounds) ? String(branch.rounds) : "待导入"
    );

    const notes = [];
    if (hasValue(pair?.note)) notes.push(String(pair.note));
    if (hasValue(branch.note)) notes.push(String(branch.note));
    addDetail("备注", notes.length ? notes.join("；") : "暂无备注");

    const comparison = document.getElementById("pair-comparison-content");
    comparison.replaceChildren();
    ["history_0", "history_1"].forEach(history => {
      const comparisonBranch = pair && isRecord(pair[history]) ? pair[history] : {};
      const item = element("div", "comparison-item");
      item.append(
        element("span", "comparison-history", history),
        resultBadge(comparisonBranch.success)
      );
      comparison.append(item);
    });
  }

  function openResult(model, harness, pairs, state, trigger) {
    previousFocus = trigger || document.activeElement;
    const { key } = getCellState(activeTask, model, harness);
    dialogContext = { task: activeTask, model, harness, pairs, state, key };
    renderDialog();
    dialog.showModal();
    document.body.classList.add("modal-open");
    document.getElementById("dialog-close").focus();
  }

  document.getElementById("dialog-pair-prev").addEventListener("click", () => {
    if (!dialogContext || dialogContext.pairs.length < 2) return;
    dialogContext.state.pairIndex = Math.max(0, dialogContext.state.pairIndex - 1);
    renderDialog();
  });

  document.getElementById("dialog-pair-next").addEventListener("click", () => {
    if (!dialogContext || dialogContext.pairs.length < 2) return;
    dialogContext.state.pairIndex = Math.min(
      dialogContext.pairs.length - 1,
      dialogContext.state.pairIndex + 1
    );
    renderDialog();
  });

  ["history_0", "history_1"].forEach(history => {
    document.getElementById(`dialog-${history.replace("_", "-")}`).addEventListener("click", () => {
      if (!dialogContext || !currentDialogPair()) return;
      dialogContext.state.history = history;
      renderDialog();
    });
  });

  document.getElementById("dialog-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    ) {
      dialog.close();
    }
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

    const closedContext = dialogContext;
    dialogContext = null;
    if (closedContext) renderMatrix();

    const focusTarget = closedContext
      ? Array.from(matrix.querySelectorAll(".result-main")).find(main =>
          main.dataset.modelId === String(closedContext.model.id) &&
          main.dataset.harnessId === String(closedContext.harness.id)
        )
      : previousFocus;
    if (focusTarget?.isConnected) focusTarget.focus();
    else if (previousFocus?.isConnected) previousFocus.focus();
  });

  search.addEventListener("input", renderTaskList);
  window.addEventListener("hashchange", restoreTask);
  window.addEventListener("popstate", restoreTask);
  restoreTask();
})();
