function reviewToday() {
  const reviewItems = getReviewTodayItems();
  reviewTodayList.textContent = "";
  reviewItems.forEach((item) => {
    const row = document.createElement("button");
    const status = document.createElement("span");
    const text = document.createElement("strong");
    const detail = document.createElement("small");
    row.type = "button";
    row.className = "review-today-row";
    row.classList.toggle("complete", item.complete);
    row.setAttribute("aria-label", `${item.title}: ${item.detail}`);
    status.textContent = item.complete ? "✓" : "!";
    text.textContent = item.title;
    detail.textContent = item.detail;
    row.append(status, text, detail);
    row.addEventListener("click", () => {
      reviewTodayModal.hidden = true;
      jumpFromDashboard(item.destination);
    });
    reviewTodayList.appendChild(row);
  });
  reviewTodayModal.hidden = false;
}

function openReminderCenter() {
  const items = getReminderCenterItems();
  reminderCenterList.textContent = "";
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "nutrition-empty";
    empty.textContent = "No open reminders right now.";
    reminderCenterList.appendChild(empty);
  }
  items.forEach((item) => {
    const row = document.createElement("button");
    const status = document.createElement("span");
    const text = document.createElement("strong");
    const detail = document.createElement("small");
    row.type = "button";
    row.className = "review-today-row reminder-center-row";
    row.classList.toggle("complete", item.tone === "steady");
    status.textContent = item.marker;
    text.textContent = item.title;
    detail.textContent = item.detail;
    row.append(status, text, detail);
    row.addEventListener("click", () => {
      reminderCenterModal.hidden = true;
      jumpFromDashboard(item.destination || "tasks");
    });
    reminderCenterList.appendChild(row);
  });
  reminderCenterModal.hidden = false;
}

function getReminderCenterItems() {
  const now = new Date();
  const todayTasks = habits.filter((habit) => isTaskScheduledForDate(habit, today));
  const openTodayTasks = todayTasks.filter((habit) => !habit.completions.includes(today));
  const overdue = getCurrentOverdueTasks(now);
  const upcomingDeadlines = getUpcomingDeadlineTasks(now);
  const upcomingTasks = getUpcomingTaskReminderCandidates(now, 5).slice(0, 4);
  const items = [];

  overdue.slice(0, 4).forEach((occurrence) => {
    items.push({
      marker: "!",
      title: occurrence.habit.name,
      detail: `Past its ${formatTaskTime(occurrence.habit.deadline)} deadline`,
      destination: "tasks"
    });
  });

  upcomingDeadlines.slice(0, 4).forEach((occurrence) => {
    const dueDate = occurrence.dateKey === today ? "today" : formatSymptomHistoryDate(occurrence.dateKey);
    items.push({
      marker: "24",
      title: occurrence.habit.name,
      detail: `Due ${formatTaskTime(occurrence.habit.deadline)} ${dueDate}`,
      destination: "tasks",
      tone: "steady"
    });
  });

  if (openTodayTasks.length) {
    items.push({
      marker: String(openTodayTasks.length),
      title: "Open today",
      detail: `${openTodayTasks.length} task${openTodayTasks.length === 1 ? "" : "s"} left today`,
      destination: "tasks"
    });
  }

  upcomingTasks.forEach((item) => {
    const when = item.offset === 1 ? "tomorrow" : `${item.dayName}, ${formatSymptomHistoryDate(item.dateKey)}`;
    items.push({
      marker: item.missedBefore ? "!" : "-",
      title: item.habit.name,
      detail: item.missedBefore ? `Coming ${when}, missed before` : `Coming ${when}`,
      destination: "tasks",
      tone: item.missedBefore ? "warn" : "steady"
    });
  });

  return items.slice(0, 10);
}

function triggerHapticFeedback(strength = "light") {
  const now = Date.now();
  if (now - lastHapticAt < 55) return;
  lastHapticAt = now;
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  const pattern = strength === "medium" ? 14 : strength === "success" ? [8, 32, 12] : 8;
  navigator.vibrate(pattern);
}

function getHapticElement(target) {
  if (!target || typeof target.closest !== "function") return null;
  return target.closest("button, [role='button'], [role='tab'], summary, select, input[type='checkbox'], input[type='radio'], input[type='range'], .day-section-header");
}

function installHapticFeedback() {
  document.addEventListener("pointerup", (event) => {
    if (event.pointerType === "mouse") return;
    const element = getHapticElement(event.target);
    if (!element || element.disabled || element.getAttribute("aria-disabled") === "true") return;
    const strength = element.matches(".primary-button, .check-button, input[type='range']") ? "medium" : "light";
    triggerHapticFeedback(strength);
  }, { capture: true, passive: true });

  document.addEventListener("change", (event) => {
    const element = getHapticElement(event.target);
    if (!element) return;
    triggerHapticFeedback("light");
  }, { capture: true });

  document.addEventListener("submit", () => {
    triggerHapticFeedback("success");
  }, { capture: true });
}

function showToast(message) {
  if (!appToast) return;
  appToast.textContent = message;
  appToast.hidden = false;
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    appToast.hidden = true;
  }, 1800);
}

function getReviewTodayItems() {
  const summary = getTodaySummary();
  const todayTasks = summary.tasks;
  const incompleteTasks = summary.incompleteTasks;
  return [
    {
      title: "Tasks",
      detail: todayTasks.length ? (incompleteTasks.length ? `${incompleteTasks.length} still open` : "Complete") : "Not logged",
      complete: !incompleteTasks.length && todayTasks.length > 0,
      destination: "tasks"
    }
  ];
}

function hasVitalsData(entry) {
  return Boolean(entry) && [
    entry.calories,
    entry.carbs,
    entry.weight,
    entry.glucose,
    entry.systolic,
    entry.diastolic
  ].some(Number.isFinite);
}

function setOverviewModule(moduleName) {
  const selectedModule = overviewModules.includes(moduleName) ? moduleName : "coach";
  overviewPanels.forEach((panel) => {
    panel.hidden = panel.dataset.overviewPanel !== selectedModule;
  });
  overviewTabs.forEach((tab) => {
    const isSelected = tab.dataset.overviewModule === selectedModule;
    tab.setAttribute("aria-selected", String(isSelected));
    if (isSelected) tab.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  });
}

function handleOverviewSwipe(deltaX) {
  if (Math.abs(deltaX) < 48) return;
  const currentModule = Array.from(overviewTabs).find((tab) => tab.getAttribute("aria-selected") === "true")?.dataset.overviewModule || "coach";
  const currentIndex = overviewModules.indexOf(currentModule);
  const direction = deltaX < 0 ? 1 : -1;
  const nextIndex = Math.max(0, Math.min(overviewModules.length - 1, currentIndex + direction));
  if (nextIndex !== currentIndex) {
    setOverviewModule(overviewModules[nextIndex]);
  }
}

function setWellbeingModule(moduleName) {
  const selectedModule = wellbeingModules.includes(moduleName) ? moduleName : "vitals";
  const panels = {
    vitals: nutritionPanel,
    charts: chartsPanel,
    symptoms: symptomPanel
  };
  Object.entries(panels).forEach(([name, panel]) => {
    if (!panel) return;
    panel.hidden = name !== selectedModule;
  });
  wellbeingTabs.forEach((tab) => {
    const isSelected = tab.dataset.wellbeingModule === selectedModule;
    tab.setAttribute("aria-selected", String(isSelected));
    if (isSelected) tab.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  });
  if (selectedModule === "charts") {
    vitalsHistoryDropdown.open = true;
    syncHistoryControls();
    renderHistory();
  }
}

function handleWellbeingSwipe(deltaX) {
  if (Math.abs(deltaX) < 48) return;
  const currentModule = Array.from(wellbeingTabs).find((tab) => tab.getAttribute("aria-selected") === "true")?.dataset.wellbeingModule || "vitals";
  const currentIndex = wellbeingModules.indexOf(currentModule);
  const direction = deltaX < 0 ? 1 : -1;
  const nextIndex = Math.max(0, Math.min(wellbeingModules.length - 1, currentIndex + direction));
  if (nextIndex !== currentIndex) {
    setWellbeingModule(wellbeingModules[nextIndex]);
  }
}

function bindWellbeingSwipeTarget(target) {
  target?.addEventListener("touchstart", (event) => {
    wellbeingSwipeStartX = event.touches[0]?.clientX || 0;
    wellbeingSwipeStartY = event.touches[0]?.clientY || 0;
  }, { passive: true });
  target?.addEventListener("touchend", (event) => {
    const touch = event.changedTouches[0];
    const deltaX = (touch?.clientX || wellbeingSwipeStartX) - wellbeingSwipeStartX;
    const deltaY = (touch?.clientY || wellbeingSwipeStartY) - wellbeingSwipeStartY;
    if (Math.abs(deltaY) > Math.abs(deltaX)) return;
    handleWellbeingSwipe(deltaX);
  });
}

function renderSymptoms() {
  if (!symptomList || !symptomEmpty) return;
  symptomList.textContent = "";
  symptomEmpty.hidden = symptomEntries.length > 0;
  symptomEntries.slice(0, 8).forEach((entry) => {
    const item = document.createElement("article");
    const text = document.createElement("div");
    const title = document.createElement("strong");
    const meta = document.createElement("span");
    const close = document.createElement("button");
    item.className = "symptom-item";
    item.dataset.level = entry.severity;
    title.textContent = entry.name;
    meta.textContent = [formatEntryDate(entry.date), entry.severity, entry.note].filter(Boolean).join(" / ");
    close.className = "delete-button";
    close.type = "button";
    close.setAttribute("aria-label", `Delete ${entry.name}`);
    close.textContent = "x";
    close.addEventListener("click", () => deleteSymptom(entry.id));
    text.append(title, meta);
    item.append(text, close);
    symptomList.appendChild(item);
  });
}

function renderSymptomHistory() {
  if (!symptomHistoryRows || !symptomHistoryEmpty) return;
  const historyEntries = getSymptomHistoryEntries();
  symptomHistoryRows.textContent = "";
  symptomHistoryEmpty.hidden = historyEntries.length > 0;

  historyEntries.forEach((entry) => {
    const row = document.createElement("tr");
    [formatSymptomHistoryDate(entry.date), entry.name, entry.severity, entry.note || "--"].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });
    symptomHistoryRows.appendChild(row);
  });
}

function deleteSymptom(id) {
  symptomEntries = symptomEntries.filter((entry) => entry.id !== id);
  saveSymptomEntries();
  renderSymptoms();
  renderSymptomHistory();
}

function renderMoods() {
  if (!moodList || !moodEmpty) return;
  moodList.textContent = "";
  moodEmpty.hidden = moodEntries.length > 0;
  moodEntries.slice(0, 8).forEach((entry) => {
    const item = document.createElement("article");
    const text = document.createElement("div");
    const title = document.createElement("strong");
    const meta = document.createElement("span");
    const close = document.createElement("button");
    item.className = "symptom-item mood-item";
    item.dataset.level = entry.intensity;
    title.textContent = entry.name;
    meta.textContent = [formatEntryDate(entry.date), entry.intensity, entry.note].filter(Boolean).join(" / ");
    close.className = "delete-button";
    close.type = "button";
    close.setAttribute("aria-label", `Delete ${entry.name}`);
    close.textContent = "x";
    close.addEventListener("click", () => deleteMood(entry.id));
    text.append(title, meta);
    item.append(text, close);
    moodList.appendChild(item);
  });
}

function renderMoodHistory() {
  if (!moodHistoryRows || !moodHistoryEmpty) return;
  const historyEntries = getMoodHistoryEntries();
  moodHistoryRows.textContent = "";
  moodHistoryEmpty.hidden = historyEntries.length > 0;

  historyEntries.forEach((entry) => {
    const row = document.createElement("tr");
    [formatSymptomHistoryDate(entry.date), entry.name, entry.intensity, entry.note || "--"].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });
    moodHistoryRows.appendChild(row);
  });
}

function deleteMood(id) {
  moodEntries = moodEntries.filter((entry) => entry.id !== id);
  saveMoodEntries();
  renderMoods();
  renderMoodHistory();
}

function renderJournal() {
  journalEntries = loadJournalEntries();
  updateJournalLogButton();
}

function updateJournalLogButton() {
  if (!journalLogLink) return;
  journalLogLink.textContent = `Journal Log (${journalEntries.length})`;
}

function openJournalLogList() {
  journalEntries = loadJournalEntries();
  const modal = document.createElement("section");
  const panel = document.createElement("div");
  const heading = document.createElement("div");
  const titleWrap = document.createElement("div");
  const title = document.createElement("h2");
  const actions = document.createElement("div");
  const deleteAllButton = document.createElement("button");
  const closeButton = document.createElement("button");
  const logControls = document.createElement("div");
  const list = document.createElement("div");

  modal.className = "history-modal journal-log-modal";
  modal.setAttribute("aria-labelledby", "journalLogDialogTitle");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("role", "dialog");
  panel.className = "history-panel journal-log-panel";
  heading.className = "section-heading";
  title.id = "journalLogDialogTitle";
  title.textContent = "Journal Log";
  actions.className = "journal-log-actions";
  deleteAllButton.className = "text-button danger-action journal-delete-all-button";
  deleteAllButton.type = "button";
  deleteAllButton.textContent = "Delete all";
  deleteAllButton.disabled = journalEntries.length === 0;
  closeButton.className = "delete-button";
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Close journal log");
  closeButton.textContent = "x";
  logControls.className = "journal-log-controls";
  list.className = "symptom-list journal-log-list";

  buildJournalLogList(list, (entry, label) => openJournalEntryDialog(entry, label, modal));
  titleWrap.append(title);
  actions.append(closeButton);
  heading.append(titleWrap, actions);
  logControls.append(deleteAllButton);
  panel.append(heading, logControls, list);
  modal.appendChild(panel);
  document.body.appendChild(modal);

  const close = () => modal.remove();
  deleteAllButton.addEventListener("click", () => {
    if (!window.confirm("Are you sure you want to delete all journal entries? This cannot be undone.")) return;
    if (!window.confirm("Are you absolutely sure? This permanently deletes every journal entry.")) return;
    deleteAllJournalEntries();
    list.textContent = "";
    buildJournalLogList(list, (entry, label) => openJournalEntryDialog(entry, label, modal));
    deleteAllButton.disabled = true;
  });
  closeButton.addEventListener("click", close);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  });
  window.addEventListener("keydown", function onKeydown(event) {
    if (event.key !== "Escape") return;
    close();
    window.removeEventListener("keydown", onKeydown);
  });
  window.setTimeout(() => {
    const firstEntry = list.querySelector(".journal-item:not(.journal-empty-log)");
    (firstEntry || closeButton).focus({ preventScroll: true });
  }, 30);
}

function buildJournalLogList(container, onEntryClick) {
  const groupedEntries = journalEntries.reduce((groups, entry) => {
    if (!groups.has(entry.date)) groups.set(entry.date, []);
    groups.get(entry.date).push(entry);
    return groups;
  }, new Map());
  const dateKeys = [...new Set(journalEntries.map((entry) => entry.date))]
    .sort((first, second) => second.localeCompare(first));

  dateKeys.forEach((dateKey) => {
    const entries = groupedEntries.get(dateKey) || [];
    if (!entries.length) return;
    const group = document.createElement("section");
    const heading = document.createElement("h3");
    const dateLabel = formatEntryDate(dateKey);
    group.className = "journal-date-group";
    heading.className = "journal-date-heading";
    heading.textContent = `${dateLabel} - ${entries.length} entr${entries.length === 1 ? "y" : "ies"}`;
    group.appendChild(heading);
    entries.forEach((entry, index) => {
      const item = document.createElement("button");
      const text = document.createElement("span");
      const title = document.createElement("strong");
      const meta = document.createElement("span");
      const label = getJournalEntryPreview(entry, index);
      item.className = "symptom-item journal-item";
      item.type = "button";
      item.setAttribute("aria-label", `${label}, ${dateLabel}`);
      title.textContent = label;
      meta.textContent = dateLabel;
      item.addEventListener("click", () => onEntryClick(entry, label));
      text.append(title, meta);
      item.appendChild(text);
      group.appendChild(item);
    });
    container.appendChild(group);
  });
  if (!container.children.length) {
    const emptyItem = document.createElement("div");
    emptyItem.className = "nutrition-empty";
    emptyItem.textContent = "No journal entries logged.";
    container.appendChild(emptyItem);
  }
}

function getJournalEntryPreview(entry, index) {
  const preview = String(entry.text || "").replace(/\s+/g, " ").trim();
  if (preview) return preview.length > 72 ? `${preview.slice(0, 72)}...` : preview;
  return `Journal entry ${index + 1}`;
}

function buildJournalEmptyLogItem(dateKey) {
  const emptyItem = document.createElement("div");
  const text = document.createElement("span");
  const title = document.createElement("strong");
  const meta = document.createElement("span");
  emptyItem.className = "symptom-item journal-item journal-empty-log";
  title.textContent = "No entry logged";
  meta.textContent = formatEntryDate(dateKey);
  text.append(title, meta);
  emptyItem.appendChild(text);
  return emptyItem;
}

function openJournalEntryDialog(entry, label, returnModal = null) {
  if (returnModal) returnModal.hidden = true;
  const modal = document.createElement("section");
  const panel = document.createElement("div");
  const heading = document.createElement("div");
  const titleWrap = document.createElement("div");
  const eyebrow = document.createElement("p");
  const title = document.createElement("h2");
  const actions = document.createElement("div");
  const backButton = document.createElement("button");
  const deleteButton = document.createElement("button");
  const closeButton = document.createElement("button");
  const body = document.createElement("p");

  modal.className = "history-modal journal-entry-modal";
  modal.setAttribute("aria-labelledby", "journalEntryTitle");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("role", "dialog");
  panel.className = "history-panel journal-entry-panel";
  heading.className = "section-heading";
  eyebrow.className = "eyebrow";
  eyebrow.textContent = label;
  title.id = "journalEntryTitle";
  title.textContent = formatEntryDate(entry.date);
  actions.className = "journal-entry-actions";
  backButton.className = "text-button journal-back-button";
  backButton.type = "button";
  backButton.textContent = "Back";
  backButton.hidden = !returnModal;
  deleteButton.className = "text-button journal-delete-button danger-action";
  deleteButton.type = "button";
  deleteButton.textContent = "Delete";
  closeButton.className = "delete-button";
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Close journal entry");
  closeButton.textContent = "x";
  body.className = "journal-entry-text";
  body.textContent = entry.text;

  actions.append(backButton, deleteButton, closeButton);
  titleWrap.append(eyebrow, title);
  heading.append(titleWrap, actions);
  panel.append(heading, body);
  modal.appendChild(panel);
  document.body.appendChild(modal);

  const close = () => {
    modal.remove();
    if (returnModal) returnModal.hidden = false;
  };
  backButton.addEventListener("click", close);
  deleteButton.addEventListener("click", () => {
    if (!window.confirm("Are you sure you want to delete this journal entry? This cannot be undone.")) return;
    deleteJournalEntry(entry.id);
    modal.remove();
    if (returnModal) {
      returnModal.remove();
      openJournalLogList();
    }
  });
  closeButton.addEventListener("click", close);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  });
  window.addEventListener("keydown", function onKeydown(event) {
    if (event.key !== "Escape") return;
    close();
    window.removeEventListener("keydown", onKeydown);
  });
}

function deleteJournalEntry(id) {
  const entry = journalEntries.find((item) => item.id === id);
  if (entry?.date && entry?.text) {
    const deletedKeys = loadDeletedJournalEntryKeys();
    deletedKeys.add(`${entry.date}:${entry.text}`);
    saveDeletedJournalEntryKeys(deletedKeys);
  }
  journalEntries = journalEntries.filter((entry) => entry.id !== id);
  saveJournalEntries();
  renderJournal();
  scheduleSmartCoachRender();
  showToast("Journal entry deleted.");
}

function deleteAllJournalEntries() {
  const deletedKeys = loadDeletedJournalEntryKeys();
  journalEntries.forEach((entry) => {
    if (entry?.date && entry?.text) deletedKeys.add(`${entry.date}:${entry.text}`);
  });
  saveDeletedJournalEntryKeys(deletedKeys);
  journalEntries = [];
  localStorage.setItem(journalStoreKey, JSON.stringify([]));
  ["habit-tracker:journal:v1", "habit-tracker:journal", "journalEntries"].forEach((key) => {
    localStorage.removeItem(key);
  });
  renderJournal();
  scheduleSmartCoachRender();
  showToast("All journal entries deleted.");
}

function editHabit(id) {
  const habit = habits.find((item) => item.id === id);
  if (!habit) return;
  editingHabitId = id;
  habitName.value = habit.name;
  if (taskDate) taskDate.value = getTaskDateKey(habit);
  habitCategory.value = habit.category || "General";
  habitDeadline.value = normalizeTaskTime(habit.deadline);
  habitPriority.value = normalizeTaskPriority(habit.priority);
  if (habitSize) habitSize.value = normalizeTaskSize(habit.size);
  syncTaskChoiceButtons();
  habitNote.value = habit.note || "";
  habitForm.querySelector(".primary-button").textContent = "Save task";
  habitName.focus();
}

function openTaskBreakdownPrompt(task, options = {}) {
  if (!task) return;
  const modal = buildTaskBreakdownShell(task, {
    title: "Photo checklist",
    intro: "Add a photo or a few details. AI will turn the messy part into tiny checkable steps.",
    cancelDeletesTask: Boolean(options.cancelDeletesTask)
  });
  const actions = document.createElement("div");
  const generateButton = document.createElement("button");

  modal.body.appendChild(buildTaskBreakdownDetailInput(task, modal));
  actions.className = "settings-actions task-breakdown-actions task-breakdown-submit-actions";
  generateButton.className = "primary-button";
  generateButton.type = "button";
  generateButton.textContent = "Submit";
  actions.append(generateButton);
  modal.body.appendChild(actions);
  document.body.appendChild(modal.root);
  updateDialogScrollLock();

  generateButton.addEventListener("click", () => generateTaskBreakdown(task, modal));
  if (options.autoPhoto) modal.issuePhotoInput?.click();
  if (options.autoGallery) modal.issueGalleryPhotoInput?.click();
}

function openTaskBreakdownDialog(task) {
  if (!task) return;
  const breakdown = taskBreakdowns[task.id];
  const modal = buildTaskBreakdownShell(task, {
    title: breakdown ? "AI checklist" : "Photo checklist",
    intro: breakdown ? breakdown.summary : "Add a photo or a few details. AI will turn the messy part into tiny checkable steps."
  });
  document.body.appendChild(modal.root);
  updateDialogScrollLock();

  if (breakdown) {
    renderTaskBreakdownSteps(task, modal, breakdown);
  } else {
    const actions = document.createElement("div");
    const generateButton = document.createElement("button");
    modal.body.appendChild(buildTaskBreakdownDetailInput(task, modal));
    actions.className = "settings-actions task-breakdown-actions task-breakdown-submit-actions";
    generateButton.className = "primary-button";
    generateButton.type = "button";
    generateButton.textContent = "Submit";
    actions.appendChild(generateButton);
    modal.body.appendChild(actions);
    generateButton.addEventListener("click", () => generateTaskBreakdown(task, modal));
  }
}

function openAppHelpBotDialog() {
  const modal = buildTaskBreakdownShell({ name: "TaskLens AI" }, {
    title: "AI help",
    intro: "Ask how to use the app or jump to a task action."
  });
  modal.root.classList.add("app-help-modal");
  const chat = document.createElement("div");
  const inputRow = document.createElement("form");
  const input = document.createElement("input");
  const sendButton = document.createElement("button");

  chat.className = "app-help-chat";
  modal.appHelpChatHistory = [];
  inputRow.className = "app-help-input-row";
  input.type = "text";
  input.maxLength = 1200;
  input.placeholder = "Message TaskLens AI...";
  sendButton.className = "primary-button";
  sendButton.type = "submit";
  sendButton.textContent = "Send";

  addAppHelpMessage(chat, "Tell me what you need help with. I can answer like a normal AI chat, or help you use this app without overloading you.", "assistant", modal);
  inputRow.append(input, sendButton);
  modal.body.append(chat, inputRow);
  document.body.appendChild(modal.root);
  updateDialogScrollLock();
  input.focus();

  inputRow.addEventListener("submit", (event) => {
    event.preventDefault();
    const question = input.value.replace(/\s+/g, " ").trim();
    if (!question) return;
    input.value = "";
    addAppHelpMessage(chat, question, "user", modal);
    answerAppHelpQuestion(question, chat, modal);
  });
}

function addAppHelpMessage(chat, text, role, modal = null) {
  const message = document.createElement("div");
  const normalizedRole = role === "user" ? "user" : "assistant";
  message.className = `app-help-message app-help-message-${normalizedRole === "user" ? "user" : "bot"}`;
  message.textContent = text;
  chat.appendChild(message);
  chat.scrollTop = chat.scrollHeight;
  if (modal?.appHelpChatHistory) {
    modal.appHelpChatHistory.push({ role: normalizedRole, content: String(text || "").slice(0, 1800) });
    modal.appHelpChatHistory = modal.appHelpChatHistory.slice(-12);
  }
  return message;
}

async function answerAppHelpQuestion(question, chat, modal) {
  const normalized = question.toLowerCase();
  let jumpTarget = "";
  let action = "";

  if (/\b(add|create|new)\b.*\btask\b|\btask\b.*\b(add|create|new)\b/.test(normalized)) {
    jumpTarget = "tasks";
  } else if (/\bsort|organize|overwhelm|overwhelmed|clean up|cleanup\b/.test(normalized)) {
    action = "sort";
  } else if (/\bstuck|blocked|can't start|cannot start|task paralysis|paralyzed\b/.test(normalized)) {
    jumpTarget = "tasks";
  } else if (/\bfocus|timer|one task|single task\b/.test(normalized)) {
    jumpTarget = "tasks";
  } else if (/\b(photo|picture|image|camera|inspect)\b|\bai\b.*\bchecklist\b/.test(normalized)) {
    jumpTarget = "tasks";
  } else if (/\bchecklist|steps?|check off|mark\b/.test(normalized)) {
    jumpTarget = "tasks";
  } else if (/\bsetting|backend|ai url|cloud|token\b/.test(normalized)) {
    jumpTarget = "settings";
  } else if (/\bdelete|remove\b/.test(normalized)) {
    jumpTarget = "tasks";
  } else if (/\bedit|change|rename|update\b/.test(normalized)) {
    jumpTarget = "tasks";
  }

  const thinking = addAppHelpMessage(chat, "Thinking...", "assistant");
  try {
    const answer = await fetchAppHelpChatReply(modal?.appHelpChatHistory || [{ role: "user", content: question }]);
    thinking.textContent = answer;
    if (modal?.appHelpChatHistory) {
      modal.appHelpChatHistory.push({ role: "assistant", content: answer.slice(0, 1800) });
      modal.appHelpChatHistory = modal.appHelpChatHistory.slice(-12);
    }
  } catch {
    const fallback = getLocalAppHelpAnswer(question);
    thinking.textContent = fallback;
    if (modal?.appHelpChatHistory) {
      modal.appHelpChatHistory.push({ role: "assistant", content: fallback.slice(0, 1800) });
      modal.appHelpChatHistory = modal.appHelpChatHistory.slice(-12);
    }
  }

  if (action === "sort") {
    const sortButton = document.createElement("button");
    sortButton.className = "text-button app-help-jump";
    sortButton.type = "button";
    sortButton.textContent = "Sort my list";
    sortButton.addEventListener("click", () => {
      organizeTaskListForAdhd();
      addAppHelpMessage(chat, "Your open tasks are sorted. Start with the first Now task, preferably Tiny or Small.", "assistant", modal);
    });
    chat.appendChild(sortButton);
    chat.scrollTop = chat.scrollHeight;
    return;
  }
  if (!jumpTarget) return;
  const jumpButton = document.createElement("button");
  jumpButton.className = "text-button app-help-jump";
  jumpButton.type = "button";
  jumpButton.textContent = jumpTarget === "settings" ? "Open settings" : "Go to tasks";
  jumpButton.addEventListener("click", () => {
    closeTaskBreakdownModal(modal.root);
    if (jumpTarget === "settings") {
      settingsButton?.click();
    } else {
      jumpFromDashboard(jumpTarget);
    }
  });
  chat.appendChild(jumpButton);
  chat.scrollTop = chat.scrollHeight;
}

async function fetchAppHelpChatReply(messages) {
  const headers = { "Content-Type": "application/json" };
  if (appSettings.aiBackendToken) headers["X-App-Token"] = appSettings.aiBackendToken;
  const backendUrl = getConfiguredAiBackendUrl();
  if (!backendUrl || !canUseCloudAi()) throw new Error("AI chat is not available.");
  const response = await fetchWithTimeout(`${backendUrl}/api/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({ messages })
  }, 30000);
  if (!response.ok) throw new Error(await getFriendlyAiError(response, "AI chat"));
  const data = await response.json();
  return String(data?.reply || "").replace(/\s+/g, " ").trim().slice(0, 2400) || getLocalAppHelpAnswer("");
}

function getLocalAppHelpAnswer(question) {
  const normalized = String(question || "").toLowerCase();
  if (/\b(add|create|new)\b.*\btask\b|\btask\b.*\b(add|create|new)\b/.test(normalized)) {
    return "Use Brain dump at the top: write the messy thought, choose Now/Next/Later and a size, then tap Turn into task.";
  }
  if (/\bsort|organize|overwhelm|overwhelmed|clean up|cleanup\b/.test(normalized)) {
    return "I can sort open tasks so Now comes first, then Next, then Later, with Tiny and deadline tasks pulled upward.";
  }
  if (/\bstuck|blocked|can't start|cannot start|task paralysis|paralyzed\b/.test(normalized)) {
    return "When a task feels stuck, tap Stuck on that task. I will help turn it into the smallest visible next step.";
  }
  if (/\bfocus|timer|one task|single task\b/.test(normalized)) {
    return "Use Focus on a task when you want one-task mode: pick 5, 10, 15, or 25 minutes and stay with only that task.";
  }
  if (/\b(photo|picture|image|camera|inspect)\b|\bai\b.*\bchecklist\b/.test(normalized)) {
    return "Take a picture, add any important detail, then submit it. The checklist comes first; make a target picture only if you need one.";
  }
  if (/\bchecklist|steps?|check off|mark\b/.test(normalized)) {
    return "Open the task's AI List button. Checkboxes mark steps done, text fields let you edit steps, and Add creates another step.";
  }
  if (/\bsetting|settings\b/.test(normalized)) {
    return "Open Settings from the top controls. Keep it simple: turn cloud AI on if you want AI chat and photo checklists.";
  }
  return "AI chat is unavailable right now, but I can still help with the app: add a brain dump task, take a photo for an AI checklist, sort your list, or use Focus on one task.";
}

let activeFocusSessionTimer = null;

function normalizeTaskPriority(value) {
  const priority = String(value || "").trim();
  if (["Now", "Next", "Later"].includes(priority)) return priority;
  if (/high/i.test(priority)) return "Now";
  if (/low/i.test(priority)) return "Later";
  return "Next";
}

function normalizeTaskSize(value) {
  const size = String(value || "").trim();
  return ["Tiny", "Small", "Medium", "Big"].includes(size) ? size : "Small";
}

function organizeTaskListForAdhd() {
  const priorityOrder = { Now: 0, Next: 1, Later: 2 };
  const sizeOrder = { Tiny: 0, Small: 1, Medium: 2, Big: 3 };
  habits = [...habits].sort((first, second) => {
    const firstDone = first.completions?.includes(getTaskDateKey(first)) ? 1 : 0;
    const secondDone = second.completions?.includes(getTaskDateKey(second)) ? 1 : 0;
    if (firstDone !== secondDone) return firstDone - secondDone;
    const firstDate = getTaskDateKey(first);
    const secondDate = getTaskDateKey(second);
    if (firstDate !== secondDate) return firstDate.localeCompare(secondDate);
    const priorityDiff = (priorityOrder[normalizeTaskPriority(first.priority)] ?? 1) - (priorityOrder[normalizeTaskPriority(second.priority)] ?? 1);
    if (priorityDiff) return priorityDiff;
    const firstDeadline = normalizeTaskTime(first.deadline) || "99:99";
    const secondDeadline = normalizeTaskTime(second.deadline) || "99:99";
    if (firstDeadline !== secondDeadline) return firstDeadline.localeCompare(secondDeadline);
    return (sizeOrder[normalizeTaskSize(first.size)] ?? 1) - (sizeOrder[normalizeTaskSize(second.size)] ?? 1);
  });
  saveHabits();
  render();
  showToast("List sorted into a calmer order.");
}

function openTaskStuckDialog(task) {
  if (!task) return;
  const modal = buildTaskBreakdownShell(task, {
    title: "Stuck mode",
    intro: "Name the blocker. TaskLens will make the next step smaller."
  });
  modal.root.classList.add("task-stuck-modal");
  const field = document.createElement("textarea");
  const suggestion = document.createElement("p");
  const actions = document.createElement("div");
  const makeStepButton = document.createElement("button");
  const closeButton = document.createElement("button");

  field.rows = 4;
  field.maxLength = 360;
  field.placeholder = "What is blocking you? Too vague, too big, missing info, don't know where to start...";
  field.className = "task-stuck-input";
  suggestion.className = "task-stuck-suggestion";
  suggestion.textContent = getTinyNextStep(task, "");
  actions.className = "settings-actions task-breakdown-actions";
  makeStepButton.className = "primary-button";
  makeStepButton.type = "button";
  makeStepButton.textContent = "Make this the first step";
  closeButton.className = "text-button";
  closeButton.type = "button";
  closeButton.textContent = "Close";

  field.addEventListener("input", () => {
    suggestion.textContent = getTinyNextStep(task, field.value);
  });
  makeStepButton.addEventListener("click", () => {
    addTinyStepToTaskBreakdown(task, suggestion.textContent, field.value);
    closeTaskBreakdownModal(modal.root);
    openTaskBreakdownDialog(task);
  });
  closeButton.addEventListener("click", () => closeTaskBreakdownModal(modal.root));

  actions.append(makeStepButton, closeButton);
  modal.body.append(field, suggestion, actions);
  document.body.appendChild(modal.root);
  updateDialogScrollLock();
  field.focus();
}

function getTinyNextStep(task, blocker) {
  const taskName = String(task?.name || "this task").trim();
  const text = String(blocker || "").toLowerCase();
  if (/\bcall|phone|text|email|message\b/.test(taskName.toLowerCase())) return `Open the contact or message thread for "${taskName}".`;
  if (/\bclean|room|kitchen|laundry|dishes|trash\b/.test(taskName.toLowerCase())) return "Set a 5-minute timer and move only five visible items.";
  if (/\bmissing|info|information|don't know|dont know|unsure|confused\b/.test(text)) return "Write down the one piece of information needed before doing anything else.";
  if (/\btoo big|overwhelming|overwhelmed|huge|many\b/.test(text) || normalizeTaskSize(task?.size) === "Big") return `Do only the first two minutes of "${taskName}". Stop after that if needed.`;
  return `Open whatever you need for "${taskName}" and do the first visible action.`;
}

function addTinyStepToTaskBreakdown(task, stepText, blocker) {
  const existing = taskBreakdowns[task.id] || {
    title: task.name,
    summary: "Start with the smallest visible step.",
    generatedAt: new Date().toISOString(),
    sourcePrompt: String(blocker || task.note || "").trim(),
    sourceImageDataUrl: "",
    steps: []
  };
  existing.steps = [{
    id: `${task.id}:stuck:${Date.now()}`,
    text: String(stepText || "").trim().slice(0, 180),
    done: false
  }, ...(existing.steps || [])].slice(0, 12);
  existing.summary = "Start with the smallest visible step.";
  existing.sourcePrompt = String(blocker || existing.sourcePrompt || "").trim().slice(0, 1600);
  taskBreakdowns = { ...taskBreakdowns, [task.id]: existing };
  saveTaskBreakdowns();
  render();
}

function openTaskFocusDialog(task) {
  if (!task) return;
  const modal = buildTaskBreakdownShell(task, {
    title: "Focus session",
    intro: "Pick one short timer for this task."
  });
  modal.root.classList.add("task-focus-modal");
  const timer = document.createElement("div");
  const choices = document.createElement("div");
  const actions = document.createElement("div");
  const doneButton = document.createElement("button");
  const smallerButton = document.createElement("button");
  const closeButton = document.createElement("button");
  const minuteOptions = [5, 10, 15, 25];

  timer.className = "task-focus-timer";
  timer.textContent = "Choose a timer";
  choices.className = "task-focus-choices";
  actions.className = "settings-actions task-breakdown-actions";

  minuteOptions.forEach((minutes) => {
    const button = document.createElement("button");
    button.className = "text-button";
    button.type = "button";
    button.textContent = `${minutes} min`;
    button.addEventListener("click", () => startTaskFocusSession(minutes, timer, modal.intro));
    choices.appendChild(button);
  });

  doneButton.className = "primary-button";
  doneButton.type = "button";
  doneButton.textContent = "Mark task done";
  doneButton.addEventListener("click", () => {
    const dateKey = getTaskDateKey(task);
    if (!task.completions.includes(dateKey)) {
      toggleHabit(task.id, dateKey);
    }
    closeTaskBreakdownModal(modal.root);
  });
  smallerButton.className = "text-button";
  smallerButton.type = "button";
  smallerButton.textContent = "Break smaller";
  smallerButton.addEventListener("click", () => {
    closeTaskBreakdownModal(modal.root);
    openTaskStuckDialog(task);
  });
  closeButton.className = "text-button";
  closeButton.type = "button";
  closeButton.textContent = "Close";
  closeButton.addEventListener("click", () => closeTaskBreakdownModal(modal.root));

  actions.append(doneButton, smallerButton, closeButton);
  modal.body.append(timer, choices, actions);
  document.body.appendChild(modal.root);
  updateDialogScrollLock();
}

function startTaskFocusSession(minutes, timer, intro) {
  window.clearInterval(activeFocusSessionTimer);
  let remaining = Math.max(1, minutes) * 60;
  const renderTime = () => {
    const mins = Math.floor(remaining / 60);
    const secs = String(remaining % 60).padStart(2, "0");
    timer.textContent = `${mins}:${secs}`;
  };
  renderTime();
  if (intro) intro.textContent = "Stay with one task. When the timer ends, choose done, continue, or break smaller.";
  activeFocusSessionTimer = window.setInterval(() => {
    remaining -= 1;
    renderTime();
    if (remaining <= 0) {
      window.clearInterval(activeFocusSessionTimer);
      activeFocusSessionTimer = null;
      timer.textContent = "Time is up";
      if (intro) intro.textContent = "Done, continue, or make the task smaller.";
      showToast("Focus session finished.");
    }
  }, 1000);
}

function buildTaskBreakdownShell(task, content) {
  const root = document.createElement("section");
  const panel = document.createElement("div");
  const heading = document.createElement("div");
  const titleWrap = document.createElement("div");
  const eyebrow = document.createElement("p");
  const title = document.createElement("h2");
  const closeButton = document.createElement("button");
  const intro = document.createElement("p");
  const body = document.createElement("div");

  root.className = "history-modal task-breakdown-modal";
  root.setAttribute("aria-labelledby", "taskBreakdownTitle");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("role", "dialog");
  panel.className = "history-panel task-breakdown-panel";
  root.taskBreakdownTaskId = task.id;
  root.taskBreakdownCancelDeletesTask = Boolean(content.cancelDeletesTask);
  root.taskBreakdownSaved = !content.cancelDeletesTask;
  heading.className = "section-heading";
  eyebrow.className = "eyebrow";
  eyebrow.textContent = task.name;
  title.id = "taskBreakdownTitle";
  title.textContent = content.title;
  closeButton.className = "delete-button";
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", content.cancelDeletesTask ? "Cancel task" : "Close task steps");
  closeButton.textContent = "x";
  intro.className = "task-breakdown-intro";
  intro.textContent = content.intro || "";
  body.className = "task-breakdown-body";

  titleWrap.append(eyebrow, title);
  heading.append(titleWrap, closeButton);
  panel.append(heading, intro, body);
  root.appendChild(panel);

  closeButton.addEventListener("click", () => closeTaskBreakdownModal(root, { cancel: true }));
  root.addEventListener("click", (event) => {
    if (event.target === root) closeTaskBreakdownModal(root, { cancel: true });
  });

  return { root, panel, eyebrow, intro, body };
}

function buildTaskBreakdownDetailInput(task, modal) {
  const wrap = document.createElement("div");
  const composer = document.createElement("div");
  const textarea = document.createElement("textarea");
  const photoInput = document.createElement("input");
  const galleryInput = document.createElement("input");
  const photoButton = document.createElement("button");
  const galleryButton = document.createElement("button");
  const photoPreview = document.createElement("img");
  const photoAnalysis = document.createElement("p");
  const tools = document.createElement("div");

  wrap.className = "task-breakdown-detail-box";

  composer.className = "task-breakdown-composer";
  textarea.rows = 3;
  textarea.maxLength = 1600;
  textarea.placeholder = "What should AI notice or prioritize?";
  textarea.value = "";
  modal.detailsInput = textarea;

  photoInput.type = "file";
  photoInput.accept = "image/*";
  photoInput.capture = "environment";
  photoInput.className = "task-breakdown-photo-input";
  photoInput.hidden = true;
  galleryInput.type = "file";
  galleryInput.accept = "image/*";
  galleryInput.className = "task-breakdown-photo-input";
  galleryInput.hidden = true;
  photoButton.className = "text-button task-breakdown-icon-button";
  photoButton.type = "button";
  photoButton.textContent = "Take photo";
  photoButton.setAttribute("aria-label", "Take a photo for AI");
  galleryButton.className = "text-button task-breakdown-icon-button";
  galleryButton.type = "button";
  galleryButton.textContent = "Choose photo";
  galleryButton.setAttribute("aria-label", "Choose an existing photo for AI");
  photoPreview.className = "task-breakdown-photo-preview";
  photoPreview.alt = "Selected issue photo preview";
  photoPreview.hidden = true;
  photoAnalysis.className = "task-breakdown-photo-analysis";
  photoAnalysis.hidden = true;
  modal.issuePhotoInput = photoInput;
  modal.issueGalleryPhotoInput = galleryInput;
  modal.issuePhotoButton = photoButton;
  modal.issueGalleryPhotoButton = galleryButton;
  modal.issuePhotoPreview = photoPreview;
  modal.issuePhotoAnalysis = photoAnalysis;
  modal.issueQuestionInput = textarea;
  modal.task = task;

  tools.className = "task-breakdown-tools";
  photoInput.addEventListener("change", () => handleTaskBreakdownPhoto(photoInput, modal));
  galleryInput.addEventListener("change", () => handleTaskBreakdownPhoto(galleryInput, modal));
  photoButton.addEventListener("click", () => photoInput.click());
  galleryButton.addEventListener("click", () => galleryInput.click());

  tools.append(photoButton, galleryButton);
  composer.append(textarea, photoInput, galleryInput);
  wrap.append(photoPreview, photoAnalysis, composer, tools);
  return wrap;
}

async function handleTaskBreakdownPhoto(input, modal) {
  const file = input.files?.[0];
  if (!file) return;
  if (!/^image\//i.test(file.type)) {
    showToast("Choose an image for AI to inspect.");
    input.value = "";
    return;
  }
  try {
    if (modal.issuePhotoAnalysis) {
      modal.issuePhotoAnalysis.hidden = false;
      modal.issuePhotoAnalysis.textContent = "Compressing photo...";
    }
    const startedAt = performance.now();
    const resized = await prepareTaskBreakdownImages(file);
    const resizeMs = Math.round(performance.now() - startedAt);
    modal.issueImageDataUrl = resized.upload;
    modal.issueImagePreviewDataUrl = resized.preview;
    modal.issuePhotoTelemetry = {
      uploadBytes: resized.upload.length,
      resizeMs
    };
    modal.issuePhotoPreview.src = resized.preview;
    modal.issuePhotoPreview.hidden = false;
    if (modal.issuePhotoButton) modal.issuePhotoButton.textContent = "Retake photo";
    if (modal.issueGalleryPhotoButton) modal.issueGalleryPhotoButton.textContent = "Choose another";
    if (modal.issuePhotoAnalysis) {
      modal.issuePhotoAnalysis.hidden = false;
      modal.issuePhotoAnalysis.textContent = "Photo ready. Submit to build the checklist.";
    }
  } catch {
    modal.issueImageDataUrl = "";
    modal.issueImagePreviewDataUrl = "";
    modal.issuePhotoTelemetry = null;
    input.value = "";
    if (modal.issuePhotoButton) modal.issuePhotoButton.textContent = "Take photo";
    if (modal.issueGalleryPhotoButton) modal.issueGalleryPhotoButton.textContent = "Choose photo";
    if (modal.issuePhotoAnalysis) {
      modal.issuePhotoAnalysis.hidden = true;
      modal.issuePhotoAnalysis.textContent = "";
    }
    showToast("Could not read that image.");
  }
}

async function prepareTaskBreakdownImages(file) {
  const image = await loadTaskBreakdownImageFile(file);
  const preview = renderTaskBreakdownImageDataUrl(image, 640, 0.64);
  const attempts = [
    [520, 0.46],
    [420, 0.38],
    [320, 0.32],
    [240, 0.28]
  ];
  for (const [maxSide, quality] of attempts) {
    const upload = renderTaskBreakdownImageDataUrl(image, maxSide, quality);
    if (upload.length <= 180000) return { upload, preview };
  }
  return {
    upload: renderTaskBreakdownImageDataUrl(image, 240, 0.24),
    preview
  };
}

function loadTaskBreakdownImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => resolve(image);
      image.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });
}

function renderTaskBreakdownImageDataUrl(image, maxSide = 1200, quality = 0.82) {
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d", { alpha: false });
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

async function downscaleTaskBreakdownImageDataUrl(imageDataUrl, maxSide = 420, quality = 0.36) {
  const source = String(imageDataUrl || "").trim();
  if (!source.startsWith("data:image/")) return "";
  return new Promise((resolve) => {
    const image = new Image();
    image.onerror = () => resolve("");
    image.onload = () => {
      try {
        resolve(renderTaskBreakdownImageDataUrl(image, maxSide, quality));
      } catch {
        resolve("");
      }
    };
    image.src = source;
  });
}

async function resizeTaskBreakdownImage(file, maxSide = 1200, quality = 0.82) {
  const image = await loadTaskBreakdownImageFile(file);
  return renderTaskBreakdownImageDataUrl(image, maxSide, quality);
}

function getTaskBreakdownDetailItems(task) {
  return [
    task.name,
    getTaskDateKey(task) ? formatSymptomHistoryDate(getTaskDateKey(task)) : "",
    formatTaskDeadline(task.deadline),
    task.category || "General",
    normalizeTaskPriority(task.priority),
    normalizeTaskSize(task.size),
    task.note ? `Note: ${task.note}` : ""
  ].filter(Boolean);
}

function closeTaskBreakdownModal(modal, options = {}) {
  if (modal?.classList?.contains("task-focus-modal")) {
    window.clearInterval(activeFocusSessionTimer);
    activeFocusSessionTimer = null;
  }
  if (options.cancel && modal?.taskBreakdownCancelDeletesTask && !modal.taskBreakdownSaved) {
    const taskId = String(modal.taskBreakdownTaskId || "");
    if (taskId) {
      habits = habits.filter((habit) => String(habit.id || "") !== taskId);
      delete taskBreakdowns[taskId];
      saveHabits();
      saveTaskBreakdowns();
      render();
      showToast("Task canceled.");
    }
  }
  modal?.remove();
  updateDialogScrollLock();
}

async function generateTaskBreakdown(task, modal) {
  const hasPhotoUpload = Boolean(String(modal?.issueImageDataUrl || "").startsWith("data:image/"));
  const replacingExistingBreakdown = Boolean(taskBreakdowns[task.id]);
  const requestStartedAt = performance.now();
  const progressTimers = [];
  if (hasPhotoUpload && !canUsePremiumPhotoAi()) {
    showPhotoAiLimitMessage(modal);
    return;
  }
  if (!canUseCloudAi()) {
    if (modal?.intro) modal.intro.textContent = "Enable cloud AI in Settings first.";
    return;
  }
  if (!modal?.body) return;
  setTaskBreakdownLoadingOnly(modal, true);
  modal.body.textContent = "";
  const loading = document.createElement("p");
  loading.className = "task-breakdown-status";
  loading.textContent = hasPhotoUpload
    ? "Reading visible items..."
    : "Building the checklist.";
  modal.body.appendChild(loading);
  if (hasPhotoUpload) {
    progressTimers.push(window.setTimeout(() => {
      if (loading.isConnected) loading.textContent = "Building checklist...";
    }, 1800));
    progressTimers.push(window.setTimeout(() => {
      if (loading.isConnected) loading.textContent = "Saving checklist.";
    }, 8000));
  }

  try {
    const sourcePrompt = String(modal.detailsInput?.value || "").replace(/\s+/g, " ").trim().slice(0, 1600);
    const sourceImageDataUrl = String(modal.issueImagePreviewDataUrl || modal.issueImageDataUrl || "").slice(0, 1200000);
    const breakdown = await fetchTaskBreakdown(task, {
      extraDetails: modal.detailsInput?.value || "",
      issueQuestion: modal.issueQuestionInput?.value || "",
      imageDataUrl: modal.issueImageDataUrl || ""
    });
    progressTimers.forEach((timer) => window.clearTimeout(timer));
    const checklistMs = Math.round(performance.now() - requestStartedAt);
    const tailoredBreakdown = breakdown;
    breakdown.sourcePrompt = sourcePrompt;
    breakdown.sourceImageDataUrl = sourceImageDataUrl.startsWith("data:image/") ? sourceImageDataUrl : "";
    tailoredBreakdown.sourcePrompt = breakdown.sourcePrompt;
    tailoredBreakdown.sourceImageDataUrl = breakdown.sourceImageDataUrl;
    tailoredBreakdown.targetImageDataUrl = "";
    tailoredBreakdown.targetImageError = String(breakdown.targetImageError || "").slice(0, 180);
    tailoredBreakdown.targetImagePending = false;
    tailoredBreakdown.photoAiTelemetry = hasPhotoUpload
      ? normalizePhotoAiTelemetry({
        ...modal.issuePhotoTelemetry,
        checklistMs,
        checklistStatus: "ok",
        recordedAt: new Date().toISOString()
      })
      : normalizePhotoAiTelemetry({});
    taskBreakdowns = { ...taskBreakdowns, [task.id]: tailoredBreakdown };
    saveTaskBreakdowns();
    if (hasPhotoUpload) recordPhotoAiTelemetry(task, tailoredBreakdown, "checklist_ok");
    recordTaskBreakdownAiEvent(task, tailoredBreakdown, "checklist_generated", {
      event: { regenerated: replacingExistingBreakdown },
      context: {
        source: "cloud_ai",
        model: appSettings.aiModel || "backend_default",
        hadPhotoUpload: hasPhotoUpload
      }
    });
    if (hasPhotoUpload) incrementPhotoAiUsage();
    renderTaskBreakdownSteps(task, modal, tailoredBreakdown);
    render();
  } catch (error) {
    progressTimers.forEach((timer) => window.clearTimeout(timer));
    if (hasPhotoUpload) {
      recordPhotoAiTelemetry(task, {
        photoAiTelemetry: normalizePhotoAiTelemetry({
          ...modal.issuePhotoTelemetry,
          checklistMs: Math.round(performance.now() - requestStartedAt),
          checklistStatus: "error",
          recordedAt: new Date().toISOString()
        })
      }, "checklist_error");
    }
    if (!modal?.body) return;
    setTaskBreakdownLoadingOnly(modal, false);
    modal.body.textContent = "";
    const message = document.createElement("p");
    message.className = "task-breakdown-status";
    message.textContent = getTaskBreakdownErrorMessage(error);
    const retryActions = document.createElement("div");
    const retryButton = document.createElement("button");
    const editButton = document.createElement("button");
    retryActions.className = "settings-actions task-breakdown-actions";
    retryButton.className = "primary-button";
    retryButton.type = "button";
    retryButton.textContent = "Try again";
    editButton.className = "text-button";
    editButton.type = "button";
    editButton.textContent = "Edit upload";
    retryButton.addEventListener("click", () => generateTaskBreakdown(task, modal));
    editButton.addEventListener("click", () => {
      modal.body.textContent = "";
      const inputBox = buildTaskBreakdownDetailInput(task, modal);
      const actions = document.createElement("div");
      const sendButton = document.createElement("button");
      actions.className = "settings-actions task-breakdown-actions task-breakdown-submit-actions";
      sendButton.className = "primary-button";
      sendButton.type = "button";
      sendButton.textContent = "Submit";
      sendButton.addEventListener("click", () => generateTaskBreakdown(task, modal));
      actions.appendChild(sendButton);
      modal.body.append(inputBox, actions);
    });
    retryActions.append(retryButton, editButton);
    modal.body.append(message, retryActions);
  }
}

function setTaskBreakdownLoadingOnly(modal, isLoading) {
  modal?.root?.classList?.toggle("task-breakdown-loading-only", Boolean(isLoading));
}

function getPhotoAiUsagePeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getPhotoAiUsage() {
  try {
    const usage = JSON.parse(localStorage.getItem(photoAiUsageStoreKey) || "{}");
    const period = getPhotoAiUsagePeriod();
    return {
      period,
      count: usage?.period === period ? Number(usage.count) || 0 : 0,
      afterCount: usage?.period === period ? Number(usage.afterCount) || 0 : 0
    };
  } catch {
    return { period: getPhotoAiUsagePeriod(), count: 0, afterCount: 0 };
  }
}

function incrementPhotoAiUsage() {
  const usage = getPhotoAiUsage();
  localStorage.setItem(photoAiUsageStoreKey, JSON.stringify({
    period: usage.period,
    count: Math.min(999, usage.count + 1),
    afterCount: usage.afterCount
  }));
}

function incrementAfterImageUsage() {
  const usage = getPhotoAiUsage();
  localStorage.setItem(photoAiUsageStoreKey, JSON.stringify({
    period: usage.period,
    count: usage.count,
    afterCount: Math.min(999, usage.afterCount + 1)
  }));
}

function canUsePremiumPhotoAi() {
  if (appSettings.premiumUnlocked) return getPhotoAiUsage().count < PREMIUM_PHOTO_AI_LIMIT;
  return getPhotoAiUsage().count < FREE_PHOTO_AI_LIMIT;
}

function canUseAfterImageAi() {
  return Boolean(appSettings.premiumUnlocked) && getPhotoAiUsage().afterCount < PREMIUM_AFTER_IMAGE_LIMIT;
}

function getPhotoAiUsageLabel() {
  const usage = getPhotoAiUsage();
  if (appSettings.premiumUnlocked) {
    return `${Math.max(0, PREMIUM_PHOTO_AI_LIMIT - usage.count)} of ${PREMIUM_PHOTO_AI_LIMIT} premium before-photo checklists and ${Math.max(0, PREMIUM_AFTER_IMAGE_LIMIT - usage.afterCount)} of ${PREMIUM_AFTER_IMAGE_LIMIT} after pictures left this month.`;
  }
  return `${Math.max(0, FREE_PHOTO_AI_LIMIT - usage.count)} of ${FREE_PHOTO_AI_LIMIT} free photo checklists left this month.`;
}

function showPhotoAiLimitMessage(modal) {
  if (!modal?.body) return;
  modal.body.textContent = "";
  const message = document.createElement("p");
  const actions = document.createElement("div");
  const textOnlyButton = document.createElement("button");
  const settingsButtonLocal = document.createElement("button");
  message.className = "task-breakdown-status";
  message.textContent = `You used the ${FREE_PHOTO_AI_LIMIT} free photo checklists for this month. Premium includes ${PREMIUM_PHOTO_AI_LIMIT} before-photo checklists and ${PREMIUM_AFTER_IMAGE_LIMIT} after pictures per month for ${PREMIUM_MONTHLY_PRICE} or ${PREMIUM_YEARLY_PRICE}. Text-only task checklists still work.`;
  actions.className = "settings-actions task-breakdown-actions";
  textOnlyButton.className = "primary-button";
  textOnlyButton.type = "button";
  textOnlyButton.textContent = "Use text only";
  settingsButtonLocal.className = "text-button";
  settingsButtonLocal.type = "button";
  settingsButtonLocal.textContent = "View Premium";
  textOnlyButton.addEventListener("click", () => {
    modal.issueImageDataUrl = "";
    modal.issueImagePreviewDataUrl = "";
    generateTaskBreakdown(modal.task, modal);
  });
  settingsButtonLocal.addEventListener("click", () => accountButton?.click());
  actions.append(textOnlyButton, settingsButtonLocal);
  modal.body.append(message, actions);
}

function showAfterImageLimitMessage() {
  if (!appSettings.premiumUnlocked) {
    showToast(`After pictures are included with Premium: ${PREMIUM_MONTHLY_PRICE} or ${PREMIUM_YEARLY_PRICE}.`);
    accountButton?.click();
    return;
  }
  showToast(`You used all ${PREMIUM_AFTER_IMAGE_LIMIT} Premium after pictures for this month.`);
}

function getTaskBreakdownErrorMessage(error) {
  const message = String(error?.message || "");
  if (/signal is aborted|aborterror|aborted|timed out|timeout/i.test(message)) {
    return "AI photo upload took too long. Try again, or retake a clearer smaller photo.";
  }
  return message || "AI could not break down this task.";
}

async function fetchTaskBreakdown(task, options = {}) {
  const headers = { "Content-Type": "application/json" };
  if (appSettings.aiBackendToken) headers["X-App-Token"] = appSettings.aiBackendToken;
  const accountIdToken = await getTaskLensAccountIdToken();
  if (accountIdToken) headers.Authorization = `Bearer ${accountIdToken}`;
  const backendUrl = getConfiguredAiBackendUrl();
  if (!backendUrl) throw new Error("AI service is not configured.");
  const imageDataUrl = String(options.imageDataUrl || "").slice(0, 900000);
  const taskPayload = {
    task: {
      name: task.name,
      date: getTaskDateKey(task),
      day: getTaskDay(task),
      category: task.category,
      priority: task.priority,
      size: task.size,
      deadline: task.deadline,
      note: task.note,
      dictationDetails: buildTaskBreakdownContext(task, options),
      issueQuestion: String(options.issueQuestion || "").trim().slice(0, 500),
      imageDataUrl
    }
  };
  const rawPhotoBlob = imageDataUrl ? dataUrlToBlob(imageDataUrl) : null;
  if (rawPhotoBlob) {
    delete headers["Content-Type"];
    headers["X-Task-Meta"] = encodeURIComponent(JSON.stringify({
      ...taskPayload.task,
      imageDataUrl: ""
    }));
    headers["Content-Type"] = rawPhotoBlob.mime;
  }
  try {
    const response = await fetchWithTimeout(`${backendUrl}/api/tasks/breakdown`, {
      method: "POST",
      headers,
      body: rawPhotoBlob ? rawPhotoBlob.blob : JSON.stringify(taskPayload)
    }, AI_TASK_BREAKDOWN_TIMEOUT_MS);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("That backend has not been updated for AI task photos yet. Deploy the latest backend, then try again.");
      }
      if (response.status === 413) {
        throw new Error("That photo is too large for the backend. Try a smaller photo.");
      }
      throw new Error(await getFriendlyAiError(response, "AI task breakdown"));
    }
    return normalizeTaskBreakdown(await response.json(), task);
  } catch (error) {
    const message = String(error?.message || "");
    if (imageDataUrl && /failed to fetch|networkerror|network error|fetch failed/i.test(message)) {
      const smallerImageDataUrl = await downscaleTaskBreakdownImageDataUrl(imageDataUrl);
      if (smallerImageDataUrl && smallerImageDataUrl.length < imageDataUrl.length) {
        const retryResponse = await fetchWithTimeout(`${backendUrl}/api/tasks/breakdown`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            task: {
              name: task.name,
              date: getTaskDateKey(task),
              day: getTaskDay(task),
              category: task.category,
              priority: task.priority,
              size: task.size,
              deadline: task.deadline,
              note: task.note,
              dictationDetails: buildTaskBreakdownContext(task, options),
              issueQuestion: String(options.issueQuestion || "").trim().slice(0, 500),
              imageDataUrl: smallerImageDataUrl.slice(0, 900000)
            }
          })
        }, AI_TASK_BREAKDOWN_TIMEOUT_MS);
        if (retryResponse.ok) {
          return normalizeTaskBreakdown(await retryResponse.json(), task);
        }
        if (retryResponse.status === 404) {
          throw new Error("That backend has not been updated for AI task photos yet. Deploy the latest backend, then try again.");
        }
        if (retryResponse.status === 413) {
          throw new Error("That photo is too large for the backend. Try a smaller photo.");
        }
        throw new Error(await getFriendlyAiError(retryResponse, "AI task breakdown"));
      }
    }
    throw error;
  }
}

function dataUrlToBlob(dataUrl) {
  const match = String(dataUrl || "").match(/^data:image\/(png|jpe?g|webp);base64,([a-z0-9+/=]+)$/i);
  if (!match) return null;
  const extension = match[1].toLowerCase().replace("jpeg", "jpg");
  const mime = extension === "jpg" ? "image/jpeg" : `image/${extension}`;
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return {
    blob: new Blob([bytes], { type: mime }),
    mime
  };
}

async function fetchTaskTargetImage(task, breakdown) {
  const imageDataUrl = String(breakdown?.sourceImageDataUrl || "").startsWith("data:image/")
    ? String(breakdown.sourceImageDataUrl).slice(0, 900000)
    : "";
  if (!imageDataUrl) return null;
  const headers = { "Content-Type": "application/json" };
  if (appSettings.aiBackendToken) headers["X-App-Token"] = appSettings.aiBackendToken;
  const accountIdToken = await getTaskLensAccountIdToken();
  if (accountIdToken) headers.Authorization = `Bearer ${accountIdToken}`;
  const backendUrl = getConfiguredAiBackendUrl();
  if (!backendUrl) throw new Error("AI service is not configured.");
  const response = await fetchWithTimeout(`${backendUrl}/api/tasks/target-image`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      task: {
        name: task.name,
        date: getTaskDateKey(task),
        day: getTaskDay(task),
        category: task.category,
        priority: task.priority,
        size: task.size,
        deadline: task.deadline,
        note: task.note,
        dictationDetails: breakdown.sourcePrompt || "",
        imageDataUrl
      },
      breakdown: {
        title: breakdown.title,
        summary: breakdown.summary,
        steps: Array.isArray(breakdown.steps) ? breakdown.steps.map((step) => ({ text: step.text })) : []
      }
    })
  }, AI_TARGET_IMAGE_TIMEOUT_MS);
  if (!response.ok) {
    throw new Error(await getFriendlyAiError(response, "AI target picture"));
  }
  const data = await response.json();
  const targetImageDataUrl = String(data?.targetImageDataUrl || "");
  return targetImageDataUrl.startsWith("data:image/") ? targetImageDataUrl.slice(0, 2200000) : null;
}

async function getTaskLensAccountIdToken() {
  try {
    if (typeof window.TaskLensAuth?.getIdToken === "function") {
      return String(await window.TaskLensAuth.getIdToken() || "").trim();
    }
  } catch {
    // The backend will return a sign-in error if account enforcement is enabled.
  }
  return "";
}

async function fetchAndSaveTaskTargetImage(task, modal, breakdown) {
  const requestStartedAt = performance.now();
  try {
    const currentBeforeRequest = taskBreakdowns[task.id];
    if (!currentBeforeRequest || currentBeforeRequest.generatedAt !== breakdown.generatedAt) return;
    taskBreakdowns[task.id] = {
      ...currentBeforeRequest,
      targetImagePending: true,
      targetImageError: ""
    };
    saveTaskBreakdowns();
    if (modal?.body?.isConnected) renderTaskBreakdownSteps(task, modal, taskBreakdowns[task.id]);
    const targetImageDataUrl = await fetchTaskTargetImage(task, breakdown);
    const afterImageMs = Math.round(performance.now() - requestStartedAt);
    const current = taskBreakdowns[task.id];
    if (!current || current.generatedAt !== breakdown.generatedAt) return;
    taskBreakdowns[task.id] = {
      ...current,
      photoAiTelemetry: normalizePhotoAiTelemetry({
        ...current.photoAiTelemetry,
        afterImageMs,
        afterImageStatus: targetImageDataUrl ? "ok" : "empty",
        recordedAt: new Date().toISOString()
      }),
      targetImageDataUrl: targetImageDataUrl || "",
      targetImageError: targetImageDataUrl ? "" : "Target picture could not be created.",
      targetImagePending: false
    };
    saveTaskBreakdowns();
    incrementAfterImageUsage();
    recordPhotoAiTelemetry(task, taskBreakdowns[task.id], targetImageDataUrl ? "after_image_ok" : "after_image_empty");
    if (modal?.body?.isConnected) renderTaskBreakdownSteps(task, modal, taskBreakdowns[task.id]);
    render();
  } catch (error) {
    const current = taskBreakdowns[task.id];
    if (!current || current.generatedAt !== breakdown.generatedAt) return;
    taskBreakdowns[task.id] = {
      ...current,
      photoAiTelemetry: normalizePhotoAiTelemetry({
        ...current.photoAiTelemetry,
        afterImageMs: Math.round(performance.now() - requestStartedAt),
        afterImageStatus: "error",
        recordedAt: new Date().toISOString()
      }),
      targetImageError: String(error?.message || "Target picture could not be created.").slice(0, 180),
      targetImagePending: false
    };
    saveTaskBreakdowns();
    recordPhotoAiTelemetry(task, taskBreakdowns[task.id], "after_image_error");
    if (modal?.body?.isConnected) renderTaskBreakdownSteps(task, modal, taskBreakdowns[task.id]);
  }
}

function recordPhotoAiTelemetry(task, breakdown, eventName) {
  try {
    const saved = JSON.parse(localStorage.getItem(photoAiTelemetryStoreKey) || "[]");
    const entries = Array.isArray(saved) ? saved : [];
    const telemetry = normalizePhotoAiTelemetry(breakdown?.photoAiTelemetry);
    entries.push({
      event: String(eventName || "photo_flow").slice(0, 60),
      taskId: String(task?.id || "").slice(0, 80),
      taskName: String(task?.name || "").slice(0, 120),
      uploadBytes: telemetry.uploadBytes,
      resizeMs: telemetry.resizeMs,
      checklistMs: telemetry.checklistMs,
      afterImageMs: telemetry.afterImageMs,
      checklistStatus: telemetry.checklistStatus,
      afterImageStatus: telemetry.afterImageStatus,
      recordedAt: new Date().toISOString()
    });
    localStorage.setItem(photoAiTelemetryStoreKey, JSON.stringify(entries.slice(-80)));
  } catch {
    // Telemetry must never block the task flow.
  }
}

function requestTaskTargetImage(task, modal, breakdown) {
  if (!String(breakdown?.sourceImageDataUrl || "").startsWith("data:image/")) {
    showToast("Add a before photo first.");
    return;
  }
  if (!canUseAfterImageAi()) {
    showAfterImageLimitMessage();
    return;
  }
  if (breakdown.targetImagePending) return;
  fetchAndSaveTaskTargetImage(task, modal, breakdown);
}

function maybeRequestAutomaticTaskAfterImage(task, modal, breakdown) {
  return;
}

function buildTaskBreakdownContext(task, options = {}) {
  return [
    String(options.extraDetails || "").trim(),
    buildTaskLearningContext(task),
    `Planning bucket: ${normalizeTaskPriority(task.priority)}.`,
    `Task size: ${normalizeTaskSize(task.size)}.`,
    task.deadline ? `Deadline: ${task.deadline}.` : "",
    "Use the learned local task patterns only as context. Make the checklist inspection-grade and photo-grounded. Each step must identify a visible location or object, the exact action, the destination, and a done-check the user can verify in a second photo. Split separate piles, surfaces, corners, containers, cords, papers, dishes, wrappers, clothing, and tools into separate steps. Avoid generic cleanup language."
  ].filter(Boolean).join(" ").slice(0, 2500);
}

function buildTaskLearningContext(task) {
  const currentId = String(task?.id || "");
  const category = String(task?.category || "").trim().toLowerCase();
  const currentTokens = getTaskLearningTokens(`${task?.name || ""} ${task?.note || ""} ${task?.category || ""}`);
  const relatedTasks = habits
    .filter((habit) => habit && String(habit.id || "") !== currentId)
    .map((habit) => {
      const haystack = `${habit.name || ""} ${habit.note || ""} ${habit.category || ""}`;
      const tokens = getTaskLearningTokens(haystack);
      const overlap = tokens.filter((token) => currentTokens.includes(token)).length;
      const sameCategory = category && String(habit.category || "").trim().toLowerCase() === category ? 2 : 0;
      const completionScore = Array.isArray(habit.completions) ? Math.min(3, habit.completions.length) : 0;
      return { habit, score: overlap + sameCategory + completionScore };
    })
    .filter((item) => item.score > 0)
    .sort((first, second) => second.score - first.score)
    .slice(0, 5)
    .map(({ habit }) => {
      const status = Array.isArray(habit.completions) && habit.completions.length ? "completed before" : "not completed yet";
      return `${habit.name}${habit.category ? ` (${habit.category})` : ""}${habit.note ? ` - ${habit.note}` : ""} [${status}]`;
    });
  const previousAi = Object.entries(taskBreakdowns || {})
    .filter(([taskId]) => taskId !== currentId)
    .map(([taskId, breakdown]) => {
      const habit = habits.find((item) => String(item.id || "") === String(taskId));
      const text = `${habit?.name || breakdown?.title || ""} ${breakdown?.summary || ""} ${breakdown?.sourcePrompt || ""}`;
      const tokens = getTaskLearningTokens(text);
      const overlap = tokens.filter((token) => currentTokens.includes(token)).length;
      return { breakdown, habit, score: overlap + (habit?.category && category && String(habit.category).toLowerCase() === category ? 2 : 0) };
    })
    .filter((item) => item.score > 0)
    .sort((first, second) => second.score - first.score)
    .slice(0, 3)
    .map(({ breakdown, habit }) => `${habit?.name || breakdown?.title || "Previous checklist"}: ${String(breakdown.summary || "").slice(0, 180)}`);
  if (!relatedTasks.length && !previousAi.length) return "";
  return [
    "Learned local context from this device:",
    relatedTasks.length ? `Related past tasks/projects: ${relatedTasks.join(" | ")}.` : "",
    previousAi.length ? `Relevant previous AI checklist patterns: ${previousAi.join(" | ")}.` : "",
    "Adapt the new checklist to these patterns without copying irrelevant steps."
  ].filter(Boolean).join(" ");
}

function getTaskLearningTokens(text) {
  const stopWords = new Set(["the", "and", "for", "with", "this", "that", "task", "thing", "stuff", "from", "into", "need", "needs", "help", "photo", "checklist"]);
  return [...new Set(String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !stopWords.has(token))
    .slice(0, 40))];
}

function normalizeTaskBreakdown(data, task) {
  const rawSteps = Array.isArray(data?.steps) ? data.steps : [];
  const steps = rawSteps
    .map((step) => typeof step === "string" ? step : step?.text)
    .map((text) => String(text || "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((text, index) => ({
      id: `${task.id}:step:${Date.now()}:${index}`,
      text: text.slice(0, 1200),
      done: false
    }));
  if (!steps.length) throw new Error("AI returned no usable steps.");
  return {
    title: String(data?.title || task.name).slice(0, 80),
    summary: String(data?.summary || "Check off each step as you go.").replace(/\s+/g, " ").trim().slice(0, 220),
    generatedAt: new Date().toISOString(),
    targetImageDataUrl: String(data?.targetImageDataUrl || "").startsWith("data:image/")
      ? String(data.targetImageDataUrl).slice(0, 2200000)
      : "",
    targetImageError: String(data?.targetImageError || "").slice(0, 180),
    targetImagePending: Boolean(data?.targetImagePending),
    steps
  };
}

function renderTaskBreakdownSteps(task, modal, breakdown) {
  if (!modal?.body) return;
  setTaskBreakdownLoadingOnly(modal, false);
  if (modal.intro) modal.intro.textContent = breakdown.summary || "Check off each step as you go.";
  modal.body.textContent = "";
  const nameEditor = buildTaskBreakdownNameEditor(task, modal, breakdown);
  const list = document.createElement("div");
  const addForm = document.createElement("form");
  const addInput = document.createElement("input");
  const addButton = document.createElement("button");
  const actions = document.createElement("div");
  const saveButton = document.createElement("button");
  const cancelButton = document.createElement("button");
  const secondaryActions = document.createElement("div");
  const retakePhotoButton = document.createElement("button");
  const helpfulButton = document.createElement("button");
  const notHelpfulButton = document.createElement("button");
  const clearDoneButton = document.createElement("button");
  const sourceCard = buildTaskBreakdownSourceCard(breakdown);
  const afterPhotoCard = buildTaskBreakdownAfterPhotoCard(task, modal, breakdown);

  list.className = "task-breakdown-steps";
  breakdown.steps.forEach((step, index) => {
    const row = document.createElement("div");
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    const text = document.createElement("textarea");
    const deleteButton = document.createElement("button");
    row.className = "task-breakdown-step-row";
    label.className = "task-breakdown-step";
    label.classList.toggle("done", step.done);
    checkbox.type = "checkbox";
    checkbox.checked = step.done;
    text.value = step.text;
    text.rows = 3;
    text.maxLength = 1200;
    text.setAttribute("aria-label", `Step ${index + 1}`);
    autosizeTaskStepText(text);
    deleteButton.className = "text-button task-breakdown-step-delete";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    checkbox.addEventListener("change", () => {
      step.done = checkbox.checked;
      label.classList.toggle("done", step.done);
      taskBreakdowns[task.id] = breakdown;
      saveTaskBreakdowns();
      recordTaskBreakdownAiEvent(task, breakdown, step.done ? "step_completed" : "step_uncompleted", {
        event: {
          stepId: step.id,
          stepText: step.text,
          completed: step.done
        }
      });
    });
    text.addEventListener("change", () => {
      const previousText = step.text;
      step.text = text.value.replace(/\s+/g, " ").trim().slice(0, 1200) || step.text;
      text.value = step.text;
      autosizeTaskStepText(text);
      taskBreakdowns[task.id] = breakdown;
      saveTaskBreakdowns();
      if (step.text !== previousText) {
        recordTaskBreakdownAiEvent(task, breakdown, "step_edited", {
          event: {
            stepId: step.id,
            previousText,
            newText: step.text
          }
        });
      }
    });
    text.addEventListener("input", () => autosizeTaskStepText(text));
    deleteButton.addEventListener("click", () => {
      const deletedText = step.text;
      breakdown.steps.splice(index, 1);
      taskBreakdowns[task.id] = breakdown;
      saveTaskBreakdowns();
      recordTaskBreakdownAiEvent(task, breakdown, "step_deleted", {
        event: {
          stepId: step.id,
          stepText: deletedText
        }
      });
      renderTaskBreakdownSteps(task, modal, breakdown);
    });
    label.append(checkbox, text);
    row.append(label, deleteButton);
    list.appendChild(row);
    queueTaskStepAutosize(text);
  });

  addForm.className = "task-breakdown-add-step";
  addInput.type = "text";
  addInput.maxLength = 1200;
  addInput.placeholder = "Add a step";
  addButton.className = "text-button";
  addButton.type = "submit";
  addButton.textContent = "Add";
  addForm.append(addInput, addButton);
  addForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = addInput.value.replace(/\s+/g, " ").trim();
    if (!text) return;
    breakdown.steps.push({
      id: `${task.id}:step:${Date.now()}`,
      text: text.slice(0, 1200),
      done: false
    });
    taskBreakdowns[task.id] = breakdown;
    saveTaskBreakdowns();
    recordTaskBreakdownAiEvent(task, breakdown, "step_added", {
      event: { stepText: text.slice(0, 1200) }
    });
    renderTaskBreakdownSteps(task, modal, breakdown);
  });

  actions.className = "task-breakdown-result-actions";
  secondaryActions.className = "settings-actions task-breakdown-actions task-breakdown-secondary-actions";
  saveButton.className = "primary-button task-breakdown-save-button";
  saveButton.type = "button";
  saveButton.textContent = "Save";
  saveButton.addEventListener("click", () => {
    if (modal?.root) modal.root.taskBreakdownSaved = true;
    const existingHabit = habits.find((habit) => String(habit.id || "") === String(task.id || ""));
    if (!existingHabit) {
      habits = [{ ...task }, ...habits];
    }
    taskBreakdowns[task.id] = breakdown;
    saveTaskBreakdowns();
    saveHabits();
    render();
    closeTaskBreakdownModal(modal.root);
    showToast("Task saved.");
  });
  cancelButton.className = "text-button task-breakdown-cancel-button";
  cancelButton.type = "button";
  cancelButton.textContent = modal?.root?.taskBreakdownCancelDeletesTask ? "Cancel" : "Close";
  cancelButton.addEventListener("click", () => closeTaskBreakdownModal(modal.root, { cancel: true }));
  retakePhotoButton.className = "text-button";
  retakePhotoButton.type = "button";
  retakePhotoButton.textContent = "Retake photo";
  retakePhotoButton.addEventListener("click", () => renderTaskBreakdownRetakePhoto(task, modal, breakdown));
  helpfulButton.className = breakdown.feedback === "helpful" ? "primary-button" : "text-button";
  helpfulButton.type = "button";
  helpfulButton.textContent = "Helpful";
  helpfulButton.addEventListener("click", () => saveTaskBreakdownFeedback(task, modal, breakdown, "helpful"));
  notHelpfulButton.className = breakdown.feedback === "not_helpful" ? "primary-button" : "text-button";
  notHelpfulButton.type = "button";
  notHelpfulButton.textContent = "Not helpful";
  notHelpfulButton.addEventListener("click", () => saveTaskBreakdownFeedback(task, modal, breakdown, "not_helpful"));
  clearDoneButton.className = "text-button";
  clearDoneButton.type = "button";
  clearDoneButton.textContent = "Clear done";
  clearDoneButton.addEventListener("click", () => {
    breakdown.steps = breakdown.steps.filter((step) => !step.done);
    taskBreakdowns[task.id] = breakdown;
    saveTaskBreakdowns();
    renderTaskBreakdownSteps(task, modal, breakdown);
  });
  secondaryActions.append(retakePhotoButton);
  actions.append(secondaryActions, cancelButton, saveButton);
  modal.body.append(...[nameEditor, sourceCard, list, afterPhotoCard, addForm, actions].filter(Boolean));
  maybeRequestAutomaticTaskAfterImage(task, modal, breakdown);
}

function buildTaskBreakdownAfterPhotoCard(task, modal, breakdown) {
  const afterImageDataUrl = getTaskBreakdownAfterImageDataUrl(breakdown);
  const hasSourceImage = Boolean(String(breakdown?.sourceImageDataUrl || "").startsWith("data:image/"));
  const isPending = Boolean(breakdown?.targetImagePending);
  const error = String(breakdown?.targetImageError || "").trim();
  if (!hasSourceImage && !afterImageDataUrl && !isPending && !error) return null;

  const card = document.createElement("section");
  const label = document.createElement("p");
  const button = document.createElement("button");

  card.className = "task-breakdown-after-photo-card";
  label.className = "task-breakdown-source-label";
  label.textContent = "After";
  card.appendChild(label);
  if (afterImageDataUrl) {
    const image = document.createElement("img");
    image.src = afterImageDataUrl;
    image.alt = "After picture for this checklist";
    card.appendChild(image);
  } else {
    const pending = document.createElement("p");
    pending.className = isPending ? "task-breakdown-target-pending" : "task-breakdown-target-error";
    pending.textContent = isPending
      ? "After image is being made in the background. You can start now."
      : (error || "Make an optional after picture when you need a visual target.");
    card.appendChild(pending);
  }
  if (hasSourceImage && !afterImageDataUrl && !isPending) {
    button.className = "text-button";
    button.type = "button";
    button.textContent = error ? "Try after picture again" : "Make after picture";
    button.addEventListener("click", () => requestTaskTargetImage(task, modal, breakdown));
    card.appendChild(button);
  }
  return card;
}

function getTaskBreakdownAfterImageDataUrl(breakdown) {
  const manualAfterImage = String(breakdown?.afterImageDataUrl || "");
  if (manualAfterImage.startsWith("data:image/")) return manualAfterImage;
  const targetImage = String(breakdown?.targetImageDataUrl || "");
  return targetImage.startsWith("data:image/") ? targetImage : "";
}

function buildTaskBreakdownNameEditor(task, modal, breakdown) {
  const form = document.createElement("form");
  const label = document.createElement("label");
  const labelText = document.createElement("span");
  const input = document.createElement("input");
  const saveButton = document.createElement("button");

  form.className = "task-breakdown-name-editor";
  label.className = "field";
  labelText.textContent = "Task name";
  input.type = "text";
  input.maxLength = 80;
  input.placeholder = "Name this task";
  input.value = shouldShowEmptyTaskNameField(task, modal, breakdown)
    ? ""
    : String(task?.name || breakdown?.title || "").slice(0, 80);
  input.setAttribute("aria-label", "Task name");
  saveButton.className = "text-button";
  saveButton.type = "submit";
  saveButton.textContent = "Save name";

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const nextName = input.value.replace(/\s+/g, " ").trim().slice(0, 80);
    if (!nextName) {
      input.focus();
      return;
    }
    const habit = habits.find((item) => String(item.id || "") === String(task.id || ""));
    if (habit) {
      habit.name = nextName;
      task.name = nextName;
      saveHabits();
    } else {
      task.name = nextName;
    }
    breakdown.title = nextName;
    taskBreakdowns[task.id] = breakdown;
    saveTaskBreakdowns();
    if (modal.eyebrow) modal.eyebrow.textContent = nextName;
    input.value = nextName;
    render();
    showToast("Task name saved.");
  });

  label.append(labelText, input);
  form.append(label, saveButton);
  return form;
}

function shouldShowEmptyTaskNameField(task, modal, breakdown) {
  if (!modal?.root?.taskBreakdownCancelDeletesTask) return false;
  const currentName = String(task?.name || "").replace(/\s+/g, " ").trim().toLowerCase();
  const currentTitle = String(breakdown?.title || "").replace(/\s+/g, " ").trim().toLowerCase();
  return currentName === "photo checklist"
    || currentTitle === "photo checklist"
    || currentName.endsWith(" photo checklist")
    || currentTitle.endsWith(" photo checklist");
}

function saveTaskBreakdownFeedback(task, modal, breakdown, feedback) {
  breakdown.feedback = feedback;
  taskBreakdowns[task.id] = breakdown;
  saveTaskBreakdowns();
  recordTaskBreakdownAiEvent(task, breakdown, "checklist_feedback", {
    event: { feedback }
  });
  renderTaskBreakdownSteps(task, modal, breakdown);
  showToast(feedback === "helpful" ? "Marked helpful." : "Marked not helpful.");
}

function recordTaskBreakdownAiEvent(task, breakdown, type, details = {}) {
  recordAiTrainingExample({
    type,
    task,
    checklist: breakdown,
    event: details.event || {},
    context: details.context || {}
  });
}

async function handleTaskBreakdownAfterPhoto(input, task, modal, breakdown) {
  const file = input.files?.[0];
  if (!file) return;
  if (!/^image\//i.test(file.type)) {
    showToast("Choose an image for the after photo.");
    input.value = "";
    return;
  }
  try {
    breakdown.afterImageDataUrl = await resizeTaskBreakdownImage(file, 900, 0.72);
    taskBreakdowns[task.id] = breakdown;
    saveTaskBreakdowns();
    recordTaskBreakdownAiEvent(task, breakdown, "after_photo_saved");
    if (modal?.body?.isConnected) {
      renderTaskBreakdownSteps(task, modal, breakdown);
    }
    showToast("After photo saved.");
  } catch {
    input.value = "";
    showToast("Could not save that after photo.");
  }
}

function renderTaskBreakdownRetakePhoto(task, modal, breakdown) {
  if (!modal?.body) return;
  if (modal.intro) modal.intro.textContent = "Update the message or photo, then send to recreate this checklist.";
  modal.body.textContent = "";
  const inputBox = buildTaskBreakdownDetailInput(task, modal);
  const actions = document.createElement("div");
  const sendButton = document.createElement("button");
  const backButton = document.createElement("button");
  if (modal.detailsInput && breakdown?.sourcePrompt) {
    modal.detailsInput.value = breakdown.sourcePrompt;
  }
  actions.className = "settings-actions task-breakdown-actions";
  sendButton.className = "primary-button";
  sendButton.type = "button";
  sendButton.textContent = "Recreate checklist";
  backButton.className = "text-button";
  backButton.type = "button";
  backButton.textContent = "Back to list";
  sendButton.addEventListener("click", () => generateTaskBreakdown(task, modal));
  backButton.addEventListener("click", () => renderTaskBreakdownSteps(task, modal, breakdown));
  actions.append(sendButton, backButton);
  modal.body.append(inputBox, actions);
  window.setTimeout(() => modal.issuePhotoInput?.click(), 120);
}

function autosizeTaskStepText(field) {
  if (!field) return;
  field.style.height = "0px";
  field.style.height = `${Math.max(field.scrollHeight + 8, 136)}px`;
}

function queueTaskStepAutosize(field) {
  window.requestAnimationFrame(() => {
    autosizeTaskStepText(field);
    window.requestAnimationFrame(() => autosizeTaskStepText(field));
  });
  window.setTimeout(() => autosizeTaskStepText(field), 160);
}

function buildTaskBreakdownSourceCard(breakdown) {
  const hasPrompt = Boolean(String(breakdown?.sourcePrompt || "").trim());
  const hasImage = Boolean(String(breakdown?.sourceImageDataUrl || "").startsWith("data:image/"));
  if (!hasPrompt && !hasImage) return null;

  const card = document.createElement("section");
  const toggle = document.createElement("button");
  const title = document.createElement("strong");
  const meta = document.createElement("span");
  const detail = document.createElement("div");

  card.className = "task-breakdown-source-card";
  toggle.className = "task-breakdown-source-toggle";
  toggle.type = "button";
  title.textContent = "Saved project history";
  meta.textContent = hasImage ? "Before photo saved" : "Checklist session saved";
  detail.className = "task-breakdown-source-detail";
  detail.hidden = !hasImage;
  card.classList.toggle("open", !detail.hidden);

  if (hasPrompt) {
    const prompt = document.createElement("p");
    prompt.textContent = breakdown.sourcePrompt;
    detail.appendChild(prompt);
  }
  if (hasImage) {
    const beforeLabel = document.createElement("p");
    const image = document.createElement("img");
    beforeLabel.className = "task-breakdown-source-label";
    beforeLabel.textContent = "Before";
    image.src = breakdown.sourceImageDataUrl;
    image.alt = "Photo submitted to AI";
    detail.append(beforeLabel, image);
  }
  const telemetryText = getTaskBreakdownTelemetryLabel(breakdown);
  if (telemetryText) {
    const telemetry = document.createElement("p");
    telemetry.className = "task-breakdown-telemetry";
    telemetry.textContent = telemetryText;
    detail.appendChild(telemetry);
  }
  toggle.append(title, meta);
  toggle.addEventListener("click", () => {
    const open = detail.hidden;
    detail.hidden = !open;
    card.classList.toggle("open", open);
  });
  card.append(toggle, detail);
  return card;
}

function getTaskBreakdownTelemetryLabel(breakdown) {
  const telemetry = normalizePhotoAiTelemetry(breakdown?.photoAiTelemetry);
  const parts = [];
  if (telemetry.uploadBytes) parts.push(`Upload ${Math.round(telemetry.uploadBytes / 1024)} KB`);
  if (telemetry.resizeMs) parts.push(`Resize ${(telemetry.resizeMs / 1000).toFixed(1)}s`);
  if (telemetry.checklistMs) parts.push(`Checklist ${(telemetry.checklistMs / 1000).toFixed(1)}s`);
  if (telemetry.afterImageMs) parts.push(`After ${(telemetry.afterImageMs / 1000).toFixed(1)}s`);
  return parts.join(" • ");
}

function openDayTaskDialog(dayName, dateKey) {
  const dayTasks = habits.filter((habit) => isTaskScheduledForDate(habit, dateKey));
  const modal = document.createElement("section");
  const panel = document.createElement("div");
  const heading = document.createElement("div");
  const titleWrap = document.createElement("div");
  const actions = document.createElement("div");
  const label = document.createElement("p");
  const title = document.createElement("h2");
  const printButton = document.createElement("button");
  const closeButton = document.createElement("button");
  const list = document.createElement("div");
  const footer = document.createElement("div");

  modal.className = "history-modal task-dialog";
  modal.setAttribute("aria-labelledby", "taskDialogTitle");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("role", "dialog");
  panel.className = "history-panel task-dialog-panel";
  heading.className = "section-heading";
  label.className = "eyebrow";
  label.textContent = "To-do list";
  title.id = "taskDialogTitle";
  title.textContent = dayName;
  actions.className = "task-dialog-actions";
  printButton.className = "text-button task-dialog-print";
  printButton.type = "button";
  printButton.textContent = "Print";
  closeButton.className = "delete-button";
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Close to-do list");
  closeButton.textContent = "x";
  list.className = "task-dialog-list";
  footer.className = "task-dialog-footer";

  titleWrap.append(label, title);
  actions.append(closeButton);
  heading.append(titleWrap, actions);
  footer.appendChild(printButton);

  if (dayTasks.length === 0) {
    const empty = document.createElement("p");
    empty.className = "day-empty";
    empty.textContent = "No tasks for this day yet.";
    list.appendChild(empty);
  } else {
    dayTasks.forEach((task) => {
      const item = document.createElement("article");
      const itemText = document.createElement("div");
      const itemTitle = document.createElement("h3");
      const meta = document.createElement("p");
      const toggle = document.createElement("button");
      const done = task.completions.includes(dateKey);

      item.className = "task-dialog-item";
      item.classList.toggle("done", done);
      item.tabIndex = 0;
      item.setAttribute("role", "button");
      item.setAttribute("aria-label", `Open ${task.name} checklist and photos`);
      itemTitle.textContent = task.name;
      meta.textContent = [task.category || "General", task.priority || "Normal"].join(" / ");
      toggle.className = "text-button task-dialog-toggle";
      toggle.type = "button";
      toggle.textContent = done ? "Done" : "Mark done";
      toggle.addEventListener("click", () => {
        modal.remove();
        toggleHabit(task.id, dateKey);
      });
      item.addEventListener("click", (event) => {
        if (isTaskCardControl(event.target)) return;
        modal.remove();
        openTaskBreakdownDialog(task);
      });
      item.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        if (isTaskCardControl(event.target)) return;
        event.preventDefault();
        modal.remove();
        openTaskBreakdownDialog(task);
      });

      itemText.append(itemTitle, meta);
      item.append(itemText, toggle);
      list.appendChild(item);
    });
  }

  const close = () => modal.remove();
  printButton.addEventListener("click", () => printTaskDialog(dayName, dateKey, dayTasks));
  closeButton.addEventListener("click", close);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  });

  panel.append(heading, list, footer);
  modal.appendChild(panel);
  document.body.appendChild(modal);
  closeButton.focus();
}

function showDailyAffirmation() {
  if (!appUnlocked) return;
  const lastShownDate = localStorage.getItem(affirmationShownStoreKey);
  const depressionOverride = shouldShowDepressionAffirmation();
  if (lastShownDate === today && !depressionOverride) return;
  const index = getAffirmationIndex(today);
  affirmationText.textContent = dailyAffirmations[index];
  affirmationModal.hidden = false;
  affirmationModal.focus();
  localStorage.setItem(affirmationShownStoreKey, today);
  if (depressionOverride) {
    localStorage.setItem(affirmationDepressionShownStoreKey, new Date().toISOString());
  }
}

function closeAffirmationModal() {
  affirmationModal.hidden = true;
}

function shouldShowDepressionAffirmation() {
  if (!hasRecentDepressionSignal()) return false;
  const lastShownAt = new Date(localStorage.getItem(affirmationDepressionShownStoreKey) || 0).getTime();
  return !Number.isFinite(lastShownAt) || Date.now() - lastShownAt >= 4 * 60 * 60 * 1000;
}

function hasRecentDepressionSignal() {
  const recentCutoff = getRecentCutoffKey(7);
  const recentMoodNotes = moodEntries
    .filter((entry) => entry.date >= recentCutoff)
    .map((entry) => `${entry.name || ""} ${entry.note || ""}`);
  const recentJournal = journalEntries
    .filter((entry) => entry.date >= recentCutoff)
    .map((entry) => entry.text || "");
  return [...recentMoodNotes, ...recentJournal].some((text) => matchesAnyPattern(text, depressionMoodPatterns));
}

function getAffirmationIndex(dateKey) {
  const dayNumber = Math.floor(parseDateKey(dateKey).getTime() / 86400000);
  return dayNumber % dailyAffirmations.length;
}

function getGoogleCalendarUrl(habit) {
  const start = getCalendarStart(habit.time || "Anytime");
  const taskDate = parseDateKey(getTaskDateKey(habit));
  start.setFullYear(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const details = [
    habit.note,
    `Date: ${formatSymptomHistoryDate(getTaskDateKey(habit))}`,
    `Category: ${habit.category || "General"}`,
    `When: ${normalizeTaskPriority(habit.priority)}`,
    `Size: ${normalizeTaskSize(habit.size)}`,
    "Created from TaskLens AI."
  ].filter(Boolean).join("\n");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Task: ${habit.name}`,
    details,
    dates: `${toCalendarDateTime(start)}/${toCalendarDateTime(end)}`
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

async function copyText(value) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Use the textarea fallback below when clipboard permissions are blocked.
    }
  }

  const field = document.createElement("textarea");
  field.value = value;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  return copied;
}

function printTaskDialog(dayName, dateKey, dayTasks) {
  const html = getTaskPrintHtml(dayName, dateKey, dayTasks);
  if (window.TaskLensPrint && typeof window.TaskLensPrint.printHtml === "function") {
    window.TaskLensPrint.printHtml(html, `${dayName} To-do list`);
    return;
  }

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.setTimeout(() => {
      printWindow.print();
    }, 250);
    return;
  }

  window.print();
}

function getTaskPrintHtml(dayName, dateKey, dayTasks) {
  const rows = dayTasks.length
    ? dayTasks.map((task) => {
      const done = task.completions.includes(dateKey);
      const meta = [
        task.category || "General",
        formatTaskDeadline(task.deadline),
        normalizeTaskPriority(task.priority),
        normalizeTaskSize(task.size)
      ].filter(Boolean).join(" / ");
      return `<li><span>${escapeHtml(task.name)}</span><small>${escapeHtml(meta)}</small><strong>${done ? "Done" : "Open"}</strong></li>`;
    }).join("")
    : "<li><span>No tasks for this day yet.</span></li>";

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(dayName)} To-do list</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111827; margin: 24px; }
    h1 { margin: 0 0 6px; font-size: 24px; }
    p { margin: 0 0 20px; color: #4b5563; }
    ul { list-style: none; margin: 0; padding: 0; }
    li { display: grid; grid-template-columns: 1fr auto; gap: 4px 16px; padding: 12px 0; border-bottom: 1px solid #d1d5db; }
    span { font-weight: 700; }
    small { color: #4b5563; }
    strong { grid-row: 1 / span 2; grid-column: 2; align-self: center; }
  </style>
</head>
<body>
  <h1>${escapeHtml(dayName)} To-do list</h1>
  <p>${escapeHtml(dateKey)}</p>
  <ul>${rows}</ul>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getCalendarStart(time) {
  const start = new Date();
  const clockTime = normalizeTaskTime(time);
  if (clockTime) {
    const [hours, minutes] = clockTime.split(":").map(Number);
    start.setHours(hours, minutes, 0, 0);
    return start;
  }

  const hourByTime = {
    Morning: 8,
    Afternoon: 13,
    Evening: 18,
    Night: 21,
    Anytime: 9
  };
  start.setHours(hourByTime[time] || 9, 0, 0, 0);
  return start;
}

function toCalendarDateTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

function isClockTime(value) {
  return /^\d{2}:\d{2}$/.test(String(value || ""));
}

function normalizeTaskTime(value) {
  const time = String(value || "").trim();
  if (isClockTime(time)) return time;
  const legacyTimes = {
    Morning: "08:00",
    Afternoon: "13:00",
    Evening: "18:00",
    Night: "21:00",
    Anytime: ""
  };
  return legacyTimes[time] || "";
}

function formatTaskDeadline(value) {
  const time = formatTaskTime(value);
  return time ? `Due ${time}` : "";
}

function formatTaskTime(value) {
  const time = normalizeTaskTime(value);
  if (!time) return "";
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function getTaskDay(habit) {
  return weekDays[parseDateKey(getTaskDateKey(habit)).getDay()];
}

function normalizeTaskDate(value) {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function getTaskDateKey(habit) {
  if (normalizeTaskDate(habit?.date)) return habit.date;
  if (weekDays.includes(habit?.day)) return getWeekdayDateKey(weekDays.indexOf(habit.day));
  return today;
}

function isTaskScheduledForDate(habit, dateKey) {
  return getTaskDateKey(habit) === dateKey;
}

function getWeekdayDateKey(dayIndex, referenceDate = new Date()) {
  const date = new Date(referenceDate);
  const offset = dayIndex - date.getDay();
  date.setDate(date.getDate() + offset);
  return toDateKey(date);
}

function getRecentCutoffKey(days) {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - days + 1);
  return toDateKey(cutoff);
}

function getDayCompletionPercent(dayHabits, dateKey) {
  if (!dayHabits.length) return 0;
  const complete = dayHabits.filter((habit) => habit.completions.includes(dateKey)).length;
  return Math.round((complete / dayHabits.length) * 100);
}

function getTaskStreak(habit, dateKey) {
  const completions = new Set(habit.completions);
  let streak = 0;
  const cursor = new Date(`${dateKey}T00:00:00`);

  while (completions.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }

  return streak;
}

function toggleHabit(id, dateKey) {
  habits = habits.map((habit) => {
    if (habit.id !== id) return habit;
    const completions = habit.completions.includes(dateKey)
      ? habit.completions.filter((date) => date !== dateKey)
      : [...habit.completions, dateKey];
    return { ...habit, completions };
  });

  saveHabits();
  render();
}

function deleteHabit(id) {
  habits = habits.filter((habit) => habit.id !== id);
  if (taskBreakdowns[id]) {
    const { [id]: _deletedBreakdown, ...remainingBreakdowns } = taskBreakdowns;
    taskBreakdowns = remainingBreakdowns;
    saveTaskBreakdowns();
  }
  saveHabits();
  render();
}

function getStreak(habit) {
  const completions = new Set(habit.completions);
  let streak = 0;
  const cursor = new Date();

  while (completions.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function getRecentDays(count = 7) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (count - 1 - index));
    return {
      key: toDateKey(date),
      label: new Intl.DateTimeFormat(undefined, { weekday: "narrow" }).format(date)
    };
  });
}
