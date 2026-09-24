const INITIAL_TIMETABLE = {
  月曜日: ["現国", "体育", "論表1", "英コミ1", "歴史総合", "数"],
  火曜日: ["英コミ1", "言文", "体育", "数", "現国", "化学基礎", "LHR"],
  水曜日: ["情報1", "生物基礎", "数", "現国", "音楽or美術", "公共"],
  木曜日: ["英コミ1", "歴史総合", "数"],
  金曜日: []
};

const DAYS = Object.keys(INITIAL_TIMETABLE);
const STORAGE_KEY = "classroom-timetable";
const SUBMISSIONS_KEY = "classroom-submissions";
const CALENDAR_EVENTS_KEY = "classroom-calendar-events";
const CREDENTIALS = {
  teacher: { username: "sensei", password: "1234", label: "先生モード" },
  student: { username: "student", password: "5678", label: "生徒モード" }
};

let timetable = loadTimetable();
let submissions = loadSubmissions();
let calendarEvents = loadCalendarEvents();
let currentRole = null;
let selectedCalendarDate = null;
const currentDate = new Date();
let calendarYear = currentDate.getFullYear();
let calendarMonth = currentDate.getMonth();

const loginScreen = document.querySelector("#login-screen");
const dashboard = document.querySelector("#dashboard");
const loginForm = document.querySelector("#login-form");
const loginError = document.querySelector("#login-error");
const table = document.querySelector("#timetable");
const notice = document.querySelector("#notice");
const menuButton = document.querySelector("#menu-button");
const actionMenu = document.querySelector("#action-menu");
const viewButtons = document.querySelectorAll(".view-menu-item");
const viewTitles = {
  calendar: ["カレンダー", "予定を確認できます。"],
  submissions: ["提出物", "提出物の状況を確認できます。"],
  timetable: ["今週の時間割", "授業の流れを、すっきり確認できます。"],
  events: ["イベント", "学校行事を確認できます。"]
};

function cloneTimetable(source) {
  return Object.fromEntries(Object.entries(source).map(([day, subjects]) => [day, [...subjects]]));
}

function loadTimetable() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...cloneTimetable(INITIAL_TIMETABLE), ...JSON.parse(saved) } : cloneTimetable(INITIAL_TIMETABLE);
  } catch {
    return cloneTimetable(INITIAL_TIMETABLE);
  }
}

function loadSubmissions() {
  try {
    return JSON.parse(localStorage.getItem(SUBMISSIONS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveSubmissions() {
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function loadCalendarEvents() {
  try {
    const saved = JSON.parse(localStorage.getItem(CALENDAR_EVENTS_KEY)) || {};
      return Object.fromEntries(Object.entries(saved).map(([date, event]) => [date, typeof event === "string" ? { title: event, startTime: "", endTime: "", members: "", color: "#e9664d", rangeStart: date, rangeEnd: date } : { title: event.title || "", startTime: event.startTime || "", endTime: event.endTime || "", members: event.members || "", color: normalizeColor(event.color), rangeStart: event.rangeStart || date, rangeEnd: event.rangeEnd || date }]));
  } catch {
    return {};
  }
}

function saveCalendarEvents() {
  localStorage.setItem(CALENDAR_EVENTS_KEY, JSON.stringify(calendarEvents));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

function formatTime(time) {
  if (!time) return "";
  const [hourText, minute] = time.split(":");
  const hour = Number(hourText);
  return `${hour < 12 ? "午前" : "午後"}${hour % 12 || 12}:${minute}`;
}

function formatPeriod(event) {
  if (!event.startTime && !event.endTime) return "時間未設定";
  return `${formatTime(event.startTime) || "--:--"}〜${formatTime(event.endTime) || "--:--"}`;
}

function formatDateRange(event) {
  const start = event.rangeStart || selectedCalendarDate;
  const end = event.rangeEnd || start;
  return start === end ? start.replace(/-/g, "/") : `${start.replace(/-/g, "/")}〜${end.replace(/-/g, "/")}`;
}

function normalizeColor(color) {
  return /^#[0-9a-f]{6}$/i.test(color || "") ? color : "#e9664d";
}

function getDateKeys(startDate, endDate) {
  const dates = [];
  const date = new Date(`${startDate}T00:00:00`);
  const lastDate = new Date(`${endDate}T00:00:00`);
  while (date <= lastDate) {
    dates.push(getLocalDateKey(date));
    date.setDate(date.getDate() + 1);
  }
  return dates;
}

function saveTimetable(statusText = "たった今、自動保存") {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(timetable));
  document.querySelector("#save-status-text").textContent = statusText;
}

function getMaxPeriods() {
  return Math.max(...DAYS.map((day) => timetable[day].length), 7);
}

function renderTimetable() {
  const maxPeriods = getMaxPeriods();
  table.querySelector("thead").innerHTML = `<tr><th scope="col">曜日</th>${Array.from({ length: maxPeriods }, (_, index) => `<th scope="col">${index + 1}限</th>`).join("")}</tr>`;
  table.querySelector("tbody").innerHTML = DAYS.map((day, dayIndex) => {
    const cells = Array.from({ length: maxPeriods }, (_, periodIndex) => {
      const subject = timetable[day][periodIndex] || "";
      const emptyClass = subject ? "" : " empty";
      const editableClass = currentRole === "teacher" ? " editable" : "";
      return `<td class="${emptyClass}${editableClass}" data-day="${day}" data-period="${periodIndex}" tabindex="${currentRole === "teacher" ? "0" : "-1"}">${subject || "—"}</td>`;
    }).join("");
    return `<tr><th scope="row">${day}<small>DAY 0${dayIndex + 1}</small></th>${cells}</tr>`;
  }).join("");
  document.querySelector("#table-caption").textContent = `${DAYS.length}日間 / ${maxPeriods}時限まで表示`;
}

function showDashboard(role) {
  currentRole = role;
  loginScreen.classList.add("hidden");
  dashboard.classList.remove("hidden");
  document.querySelector("#role-badge").textContent = CREDENTIALS[role].label;
  document.querySelector("#today-label").textContent = new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric" }).format(new Date());
  document.querySelectorAll(".teacher-only").forEach((element) => element.classList.toggle("hidden", role !== "teacher"));
  renderTimetable();
  renderCalendar();
  renderSubmissions();
  renderDeadlineAlert();
  switchView("calendar");
}

function showNotice(message) {
  notice.textContent = message;
  window.setTimeout(() => { notice.textContent = ""; }, 3000);
}

function switchView(viewName) {
  document.querySelectorAll(".app-view").forEach((view) => view.classList.toggle("hidden", view.id !== `${viewName}-view`));
  viewButtons.forEach((button) => button.classList.toggle("active", button.dataset.view === viewName));
  document.querySelector("#dashboard-title").textContent = viewTitles[viewName][0];
  document.querySelector("#dashboard-subtitle").textContent = viewTitles[viewName][1];
  document.querySelectorAll(".teacher-only").forEach((element) => element.classList.toggle("hidden", currentRole !== "teacher" || viewName !== "timetable"));
  if (viewName === "calendar") renderCalendar();
  closeMenu();
}

function renderCalendar() {
  const grid = document.querySelector("#calendar-grid");
  const now = new Date();
  document.querySelector("#calendar-month").textContent = `${calendarYear}年${calendarMonth + 1}月`;
  const firstDay = (new Date(calendarYear, calendarMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  grid.innerHTML = `${Array.from({ length: firstDay }, () => "<span></span>").join("")}${Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const dateKey = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const hasEvent = Boolean(calendarEvents[dateKey]);
    const isToday = calendarYear === now.getFullYear() && calendarMonth === now.getMonth() && day === now.getDate();
    const eventStyle = hasEvent ? ` style="--event-color: ${normalizeColor(calendarEvents[dateKey].color)}"` : "";
    const event = calendarEvents[dateKey];
    const rangePosition = hasEvent ? (event.rangeStart === event.rangeEnd ? "single" : dateKey === event.rangeStart ? "range-start" : dateKey === event.rangeEnd ? "range-end" : "range-middle") : "";
    return `<button class="calendar-date ${isToday ? "today" : ""} ${hasEvent ? `has-event ${rangePosition}` : ""}"${eventStyle} type="button" data-date="${dateKey}"><b>${day}</b>${hasEvent ? `<small>${escapeHtml(event.title)}</small>` : ""}</button>`;
  }).join("")}`;
  updateCalendarEventForm();
  renderCalendarEvents();
}

function updateCalendarEventForm() {
  const dateLabel = document.querySelector("#selected-date-label");
  const input = document.querySelector("#calendar-event-input");
  const deleteButton = document.querySelector("#calendar-event-delete");
  if (!selectedCalendarDate) {
    dateLabel.textContent = "日付を選択してください";
    input.value = "";
    document.querySelector("#calendar-event-date-start").value = "";
    document.querySelector("#calendar-event-date-end").value = "";
    document.querySelector("#calendar-event-start").value = "";
    document.querySelector("#calendar-event-end").value = "";
    document.querySelector("#calendar-event-members").value = "";
    document.querySelector("#calendar-event-color").value = "#e9664d";
    deleteButton.disabled = true;
    renderCalendarEventDetail();
    return;
  }
  dateLabel.textContent = selectedCalendarDate.replace(/-/g, "/");
  const event = calendarEvents[selectedCalendarDate];
  input.value = event?.title || "";
  document.querySelector("#calendar-event-start").value = event?.startTime || "";
  document.querySelector("#calendar-event-end").value = event?.endTime || "";
  document.querySelector("#calendar-event-members").value = event?.members || "";
  document.querySelector("#calendar-event-color").value = normalizeColor(event?.color);
  deleteButton.disabled = !event;
  renderCalendarEventDetail();
}

function renderCalendarEventDetail() {
  const detail = document.querySelector("#calendar-event-detail");
  const event = selectedCalendarDate ? calendarEvents[selectedCalendarDate] : null;
  if (!event) {
    detail.classList.add("hidden");
    detail.innerHTML = "";
    return;
  }
  detail.classList.remove("hidden");
  detail.innerHTML = `<p class="card-kicker">EVENT DETAIL</p><h3>${escapeHtml(event.title)}</h3><div class="calendar-detail-meta"><span><b>日付</b>${formatDateRange(event)}</span><span><b>時間</b>${formatPeriod(event)}</span><span><b>メンバー</b>${escapeHtml(event.members || "未設定")}</span></div>`;
}

function renderCalendarEvents() {
  const eventContainer = document.querySelector("#calendar-events");
  const todayKey = getLocalDateKey();
  const events = Object.entries(calendarEvents).filter(([date]) => date === todayKey);
  eventContainer.innerHTML = events.length ? events.map(([date, event]) => `<button class="calendar-event" type="button" data-date="${date}"><time>${formatPeriod(event)}</time><strong>${escapeHtml(event.title)}</strong></button>`).join("") : '<p class="empty-message">今日の予定はありません。</p>';
}

function renderSubmissions() {
  const list = document.querySelector("#submission-list");
  const completedCount = submissions.filter((submission) => submission.completed).length;
  document.querySelector("#submission-count").textContent = `${completedCount} / ${submissions.length} 完了`;
  if (!submissions.length) {
    list.innerHTML = '<div class="empty-view"><span class="empty-icon">□</span><p>提出物はまだありません。上のフォームから追加できます。</p></div>';
    return;
  }
  list.innerHTML = submissions.map((submission) => `<label class="submission-item ${submission.completed ? "completed" : ""}"><input type="checkbox" data-submission-id="${submission.id}" ${submission.completed ? "checked" : ""}><span class="submission-check" aria-hidden="true">✓</span><span class="submission-main"><strong>${escapeHtml(submission.title)}</strong><small>${escapeHtml(submission.subject || "教科未設定")}${submission.content ? ` / ${escapeHtml(submission.content)}` : ""}</small></span><time>${submission.due ? escapeHtml(submission.due) : "提出日未設定"}</time></label>`).join("");
}

function renderDeadlineAlert() {
  const alert = document.querySelector("#deadline-alert");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const urgentSubmissions = submissions.filter((submission) => {
    if (submission.completed || !submission.due) return false;
    const dueDate = new Date(`${submission.due}T00:00:00`);
    const daysUntilDue = Math.round((dueDate - today) / 86400000);
    return daysUntilDue >= 0 && daysUntilDue <= 3;
  }).sort((first, second) => first.due.localeCompare(second.due));
  if (!urgentSubmissions.length) {
    alert.classList.add("hidden");
    alert.innerHTML = "";
    return;
  }
  alert.classList.remove("hidden");
  alert.innerHTML = `<div class="deadline-alert-heading"><span class="deadline-alert-icon">!</span><div><strong>提出期限が近い課題</strong><small>3日以内に${urgentSubmissions.length}件あります</small></div></div><div class="deadline-list">${urgentSubmissions.map((submission) => {
    const dueDate = new Date(`${submission.due}T00:00:00`);
    const daysUntilDue = Math.round((dueDate - today) / 86400000);
    const label = daysUntilDue === 0 ? "今日まで" : daysUntilDue === 1 ? "明日まで" : `${daysUntilDue}日後まで`;
    return `<button class="deadline-item" type="button" data-deadline-submission-id="${submission.id}"><span>${escapeHtml(submission.title)}</span><strong>${label}</strong></button>`;
  }).join("")}</div>`;
}

function renderSubmissionDetail(submissionId) {
  const detail = document.querySelector("#submission-detail");
  const submission = submissions.find((item) => String(item.id) === String(submissionId));
  if (!submission) {
    detail.classList.add("hidden");
    detail.innerHTML = "";
    return;
  }
  detail.classList.remove("hidden");
  detail.innerHTML = `<div><p class="card-kicker">SELECTED TASK</p><h3>${escapeHtml(submission.title)}</h3><p>${escapeHtml(submission.content || "内容は登録されていません。")}</p></div><dl><div><dt>教科</dt><dd>${escapeHtml(submission.subject || "未設定")}</dd></div><div><dt>提出日</dt><dd>${escapeHtml(submission.due || "未設定")}</dd></div><div><dt>状態</dt><dd>${submission.completed ? "提出済み" : "未提出"}</dd></div></dl>`;
}

function closeMenu() {
  actionMenu.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "メニューを開く");
}

menuButton.addEventListener("click", () => {
  const isOpen = actionMenu.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
  menuButton.setAttribute("aria-label", isOpen ? "メニューを閉じる" : "メニューを開く");
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".topbar-actions")) closeMenu();
});

document.querySelector("#deadline-alert").addEventListener("click", (event) => {
  const item = event.target.closest("[data-deadline-submission-id]");
  if (!item) return;
  renderSubmissionDetail(item.dataset.deadlineSubmissionId);
  switchView("submissions");
});

viewButtons.forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

document.querySelector("#calendar-grid").addEventListener("click", (event) => {
  const dateButton = event.target.closest("[data-date]");
  if (!dateButton) return;
  selectedCalendarDate = dateButton.dataset.date;
  updateCalendarEventForm();
  document.querySelector("#calendar-event-input").focus();
});

document.querySelector("#calendar-events").addEventListener("click", (event) => {
  const eventButton = event.target.closest("[data-date]");
  if (!eventButton) return;
  selectedCalendarDate = eventButton.dataset.date;
  updateCalendarEventForm();
  document.querySelector("#calendar-event-input").focus();
});

document.querySelector("#calendar-event-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!selectedCalendarDate) return;
  const title = document.querySelector("#calendar-event-input").value.trim();
  if (!title) return;
  const rangeStart = document.querySelector("#calendar-event-date-start").value || selectedCalendarDate;
  const rangeEnd = document.querySelector("#calendar-event-date-end").value || rangeStart;
  if (rangeStart > rangeEnd) {
    showNotice("終了日は開始日以降にしてください");
    return;
  }
  const eventData = {
    title,
    startTime: document.querySelector("#calendar-event-start").value,
    endTime: document.querySelector("#calendar-event-end").value,
    members: document.querySelector("#calendar-event-members").value.trim(),
    color: normalizeColor(document.querySelector("#calendar-event-color").value),
    rangeStart,
    rangeEnd
  };
  const previousEvent = calendarEvents[selectedCalendarDate];
  if (previousEvent) getDateKeys(previousEvent.rangeStart || selectedCalendarDate, previousEvent.rangeEnd || selectedCalendarDate).forEach((date) => delete calendarEvents[date]);
  getDateKeys(rangeStart, rangeEnd).forEach((date) => { calendarEvents[date] = { ...eventData }; });
  saveCalendarEvents();
  renderCalendar();
  showNotice("予定を保存しました");
});

document.querySelector("#calendar-event-delete").addEventListener("click", () => {
  if (!selectedCalendarDate || !calendarEvents[selectedCalendarDate]) return;
  const event = calendarEvents[selectedCalendarDate];
  getDateKeys(event.rangeStart || selectedCalendarDate, event.rangeEnd || selectedCalendarDate).forEach((date) => delete calendarEvents[date]);
  saveCalendarEvents();
  renderCalendar();
  showNotice("予定を削除しました");
});

document.querySelector("#previous-month").addEventListener("click", () => {
  calendarMonth -= 1;
  if (calendarMonth < 0) { calendarMonth = 11; calendarYear -= 1; }
  renderCalendar();
});

document.querySelector("#next-month").addEventListener("click", () => {
  calendarMonth += 1;
  if (calendarMonth > 11) { calendarMonth = 0; calendarYear += 1; }
  renderCalendar();
});

document.querySelector("#submission-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const titleInput = document.querySelector("#submission-title");
  submissions.unshift({ id: Date.now(), title: titleInput.value.trim(), subject: document.querySelector("#submission-subject").value.trim(), due: document.querySelector("#submission-due").value, content: document.querySelector("#submission-content").value.trim(), completed: false });
  saveSubmissions();
  event.target.reset();
  renderSubmissions();
  renderDeadlineAlert();
  showNotice("提出物を追加しました");
});

document.querySelector("#submission-list").addEventListener("change", (event) => {
  const checkbox = event.target.closest("input[data-submission-id]");
  if (!checkbox) return;
  const submission = submissions.find((item) => String(item.id) === checkbox.dataset.submissionId);
  if (!submission) return;
  submission.completed = checkbox.checked;
  saveSubmissions();
  renderSubmissions();
  renderDeadlineAlert();
  showNotice(submission.completed ? "提出済みにしました" : "未提出に戻しました");
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const role = formData.get("role");
  const account = CREDENTIALS[role];
  const username = formData.get("username").trim();
  const password = formData.get("password");
  const isDevelopmentLogin = username === "" && password === "";
  if (isDevelopmentLogin || (username === account.username && password === account.password)) {
    loginError.textContent = "";
    showDashboard(role);
    return;
  }
  loginError.textContent = "ユーザー名またはパスワードが違います。";
});

table.addEventListener("click", (event) => {
  const cell = event.target.closest("td.editable");
  if (cell) startEditing(cell);
});

table.addEventListener("keydown", (event) => {
  const cell = event.target.closest("td.editable");
  if (cell && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    startEditing(cell);
  }
});

function startEditing(cell) {
  if (cell.querySelector("input")) return;
  const day = cell.dataset.day;
  const period = Number(cell.dataset.period);
  const input = document.createElement("input");
  input.className = "cell-input";
  input.value = timetable[day][period] || "";
  input.placeholder = "教科名";
  cell.textContent = "";
  cell.append(input);
  input.focus();
  input.select();
  const finish = () => {
    const value = input.value.trim();
    timetable[day].length = Math.max(timetable[day].length, period + 1);
    timetable[day][period] = value;
    while (timetable[day].length && !timetable[day][timetable[day].length - 1]) timetable[day].pop();
    saveTimetable();
    renderTimetable();
    showNotice(`${day} ${period + 1}限を変更しました`);
  };
  input.addEventListener("blur", finish, { once: true });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") input.blur();
    if (event.key === "Escape") { input.removeEventListener("blur", finish); renderTimetable(); }
  });
}

document.querySelector("#logout-button").addEventListener("click", () => {
  currentRole = null;
  closeMenu();
  dashboard.classList.add("hidden");
  loginScreen.classList.remove("hidden");
  loginForm.reset();
  loginError.textContent = "";
});

document.querySelector("#reset-button").addEventListener("click", () => {
  if (!window.confirm("時間割を初期状態に戻しますか？")) return;
  timetable = cloneTimetable(INITIAL_TIMETABLE);
  saveTimetable();
  renderTimetable();
  showNotice("初期状態に戻しました");
});

document.querySelector("#save-button").addEventListener("click", () => {
  saveTimetable("保存しました");
  showNotice("授業の変更を保存しました");
});

document.querySelector("#download-button").addEventListener("click", () => {
  const maxPeriods = getMaxPeriods();
  const lines = [
    ["曜日", ...Array.from({ length: maxPeriods }, (_, index) => `${index + 1}限`)].join("\t"),
    ...DAYS.map((day) => [day, ...Array.from({ length: maxPeriods }, (_, index) => timetable[day][index] || "")].join("\t"))
  ];
  const blob = new Blob([`\uFEFF${lines.join("\n")}\n`], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "timetable.txt";
  link.click();
  URL.revokeObjectURL(link.href);
  showNotice("timetable.txt をダウンロードしました");
});
