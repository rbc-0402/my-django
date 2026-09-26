(function () {
  const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];
  const TYPE_LABEL = { text: "文本", image: "图片", audio: "音频", video: "视频" };
  const FILE_ACCEPT = {
    image: "image/*",
    audio: "audio/*",
    video: "video/*"
  };
  const WEATHER_TEXT = {
    0: "晴",
    1: "晴间多云",
    2: "多云",
    3: "阴",
    45: "雾",
    48: "雾",
    51: "毛毛雨",
    53: "小雨",
    55: "小雨",
    61: "小雨",
    63: "中雨",
    65: "大雨",
    71: "小雪",
    73: "中雪",
    75: "大雪",
    80: "阵雨",
    81: "阵雨",
    82: "强阵雨",
    95: "雷阵雨",
    96: "雷阵雨",
    99: "雷阵雨"
  };

  const HOLIDAYS_2026 = {
    "2026-01-01": { name: "元旦", work: false },
    "2026-01-02": { name: "元旦", work: false },
    "2026-01-03": { name: "元旦", work: false },
    "2026-01-04": { name: "元旦调休", work: true },
    "2026-02-14": { name: "春节调休", work: true },
    "2026-02-15": { name: "春节", work: false },
    "2026-02-16": { name: "春节", work: false },
    "2026-02-17": { name: "春节", work: false },
    "2026-02-18": { name: "春节", work: false },
    "2026-02-19": { name: "春节", work: false },
    "2026-02-20": { name: "春节", work: false },
    "2026-02-21": { name: "春节", work: false },
    "2026-02-22": { name: "春节", work: false },
    "2026-02-23": { name: "春节", work: false },
    "2026-02-28": { name: "春节调休", work: true },
    "2026-04-04": { name: "清明", work: false },
    "2026-04-05": { name: "清明", work: false },
    "2026-04-06": { name: "清明", work: false },
    "2026-05-01": { name: "劳动节", work: false },
    "2026-05-02": { name: "劳动节", work: false },
    "2026-05-03": { name: "劳动节", work: false },
    "2026-05-04": { name: "劳动节", work: false },
    "2026-05-05": { name: "劳动节", work: false },
    "2026-05-09": { name: "劳动节调休", work: true },
    "2026-06-19": { name: "端午", work: false },
    "2026-06-20": { name: "端午", work: false },
    "2026-06-21": { name: "端午", work: false },
    "2026-09-20": { name: "国庆调休", work: true },
    "2026-09-25": { name: "中秋", work: false },
    "2026-09-26": { name: "中秋", work: false },
    "2026-09-27": { name: "中秋", work: false },
    "2026-10-01": { name: "国庆", work: false },
    "2026-10-02": { name: "国庆", work: false },
    "2026-10-03": { name: "国庆", work: false },
    "2026-10-04": { name: "国庆", work: false },
    "2026-10-05": { name: "国庆", work: false },
    "2026-10-06": { name: "国庆", work: false },
    "2026-10-07": { name: "国庆", work: false },
    "2026-10-10": { name: "国庆调休", work: true }
  };

  const SEMESTERS = [
    { start: "2025-09-01", end: "2026-01-18" },
    { start: "2026-03-02", end: "2026-07-05" },
    { start: "2026-08-31", end: "2027-01-17" },
    { start: "2027-03-01", end: "2027-07-04" }
  ];

  const els = {
    monthTitle: document.getElementById("month-title"),
    weekMeta: document.getElementById("week-meta"),
    weekdayRow: document.getElementById("weekday-row"),
    grid: document.getElementById("cal-grid"),
    selectedLine: document.getElementById("selected-line"),
    weather: document.getElementById("weather"),
    search: document.getElementById("memo-search"),
    form: document.getElementById("memo-form"),
    title: document.getElementById("memo-title"),
    type: document.getElementById("memo-type"),
    text: document.getElementById("memo-text"),
    file: document.getElementById("memo-file"),
    fileLabel: document.getElementById("file-label"),
    fileName: document.getElementById("file-name"),
    remind: document.getElementById("memo-remind"),
    list: document.getElementById("memo-list"),
    viewer: document.getElementById("viewer"),
    viewerTitle: document.getElementById("viewer-title"),
    viewerBody: document.getElementById("viewer-body"),
    viewerClose: document.getElementById("viewer-close"),
    remindModal: document.getElementById("remind-modal"),
    remindText: document.getElementById("remind-text"),
    remindOk: document.getElementById("remind-ok")
  };

  const today = new Date();
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth() + 1;
  let selected = toKey(today);
  let memos = [];
  let remindQueue = [];
  let currentBlobUrl = null;
  const objectUrls = new Map();

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function toKey(date) {
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
  }

  function parseKey(key) {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function weekdayIndex(date) {
    return (date.getDay() + 6) % 7;
  }

  function weekdayName(date) {
    return WEEKDAYS[weekdayIndex(date)];
  }

  function getHoliday(key) {
    if (HOLIDAYS_2026[key]) return HOLIDAYS_2026[key];
    const [y, m, d] = key.split("-").map(Number);
    if (typeof HolidayUtil === "undefined") return null;
    const h = HolidayUtil.getHoliday(y, m, d);
    if (!h) return null;
    return { name: h.getName() + (h.isWork() ? "调休" : ""), work: h.isWork() };
  }

  function lunarInfo(key) {
    const [y, m, d] = key.split("-").map(Number);
    const lunar = Solar.fromYmd(y, m, d).getLunar();
    const jieQi = lunar.getJieQi();
    const dayCn = lunar.getDayInChinese();
    const lunarText = dayCn === "初一" ? lunar.getMonthInChinese() + "月" : dayCn;
    return { lunarText, jieQi };
  }

  function teachingWeek(key) {
    const date = parseKey(key);
    date.setHours(0, 0, 0, 0);
    for (const sem of SEMESTERS) {
      const start = parseKey(sem.start);
      const end = parseKey(sem.end);
      if (date >= start && date <= end) {
        const diff = Math.floor((date - start) / 86400000);
        return "第" + (Math.floor(diff / 7) + 1) + "教学周";
      }
    }
    return "非教学周";
  }

  function openDb() {
    return new Promise(function (resolve, reject) {
      const req = indexedDB.open("rbc-student-calendar", 1);
      req.onupgradeneeded = function () {
        const db = req.result;
        if (!db.objectStoreNames.contains("memos")) {
          db.createObjectStore("memos", { keyPath: "id", autoIncrement: true });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  async function loadMemos() {
    const db = await openDb();
    memos = await new Promise(function (resolve, reject) {
      const tx = db.transaction("memos", "readonly");
      const req = tx.objectStore("memos").getAll();
      req.onsuccess = function () { resolve(req.result || []); };
      req.onerror = function () { reject(req.error); };
    });
    db.close();
    renderMemos();
    checkReminders();
  }

  async function saveMemo(record) {
    const db = await openDb();
    await new Promise(function (resolve, reject) {
      const tx = db.transaction("memos", "readwrite");
      tx.objectStore("memos").add(record);
      tx.oncomplete = resolve;
      tx.onerror = function () { reject(tx.error); };
    });
    db.close();
    await loadMemos();
  }

  async function markReminded(id) {
    const db = await openDb();
    await new Promise(function (resolve, reject) {
      const tx = db.transaction("memos", "readwrite");
      const store = tx.objectStore("memos");
      const req = store.get(id);
      req.onsuccess = function () {
        const item = req.result;
        if (item) {
          item.reminded = true;
          store.put(item);
        }
      };
      tx.oncomplete = resolve;
      tx.onerror = function () { reject(tx.error); };
    });
    db.close();
    await loadMemos();
  }

  function renderCalendar() {
    els.weekdayRow.innerHTML = WEEKDAYS.map(function (w) {
      return "<span>" + w + "</span>";
    }).join("");
    els.monthTitle.textContent = viewYear + "年" + viewMonth + "月";
    const selectedDate = parseKey(selected);
    els.weekMeta.textContent =
      selectedDate.getFullYear() + "年" + (selectedDate.getMonth() + 1) + "月" + selectedDate.getDate() +
      "日 星期" + weekdayName(selectedDate) + " · " + teachingWeek(selected);

    const first = new Date(viewYear, viewMonth - 1, 1);
    const startOffset = weekdayIndex(first);
    const start = new Date(viewYear, viewMonth - 1, 1 - startOffset);
    els.grid.innerHTML = "";

    for (let i = 0; i < 42; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const key = toKey(date);
      const info = lunarInfo(key);
      const holiday = getHoliday(key);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "day";
      if (date.getMonth() + 1 !== viewMonth) btn.classList.add("other");
      if (key === toKey(today)) btn.classList.add("today");
      if (key === selected) btn.classList.add("selected");

      let fest = "";
      if (holiday) {
        fest = '<span class="fest' + (holiday.work ? " work" : "") + '">' + holiday.name + "</span>";
      } else if (info.jieQi) {
        fest = '<span class="fest">' + info.jieQi + "</span>";
      }

      btn.innerHTML =
        '<span class="num">' + date.getDate() + "</span>" +
        '<span class="sub">' + info.lunarText + "</span>" +
        fest;
      btn.addEventListener("click", function () {
        selected = key;
        if (date.getMonth() + 1 !== viewMonth) {
          viewYear = date.getFullYear();
          viewMonth = date.getMonth() + 1;
        }
        renderCalendar();
        renderMemos();
      });
      els.grid.appendChild(btn);
    }

    const selDate = parseKey(selected);
    const selInfo = lunarInfo(selected);
    const selHoliday = getHoliday(selected);
    els.selectedLine.textContent =
      selected + " 星期" + weekdayName(selDate) +
      " 农历" + selInfo.lunarText +
      (selInfo.jieQi ? " " + selInfo.jieQi : "") +
      (selHoliday ? " " + selHoliday.name : "") +
      " " + teachingWeek(selected);
  }

  function memoMatchesSearch(item) {
    const q = els.search.value.trim().toLowerCase();
    if (!q) return true;
    return (item.title || "").toLowerCase().indexOf(q) !== -1;
  }

  function renderMemos() {
    const querying = els.search.value.trim().length > 0;
    const items = memos.filter(function (item) {
      if (querying) return memoMatchesSearch(item);
      return item.date === selected;
    }).sort(function (a, b) { return b.id - a.id; });

    if (!items.length) {
      els.list.innerHTML = querying
        ? "<li class='memo-item'><p>没有匹配标题的备忘录。</p></li>"
        : "<li class='memo-item'><p>这一天还没有备忘录。</p></li>";
      return;
    }

    els.list.innerHTML = "";
    items.forEach(function (item) {
      const li = document.createElement("li");
      li.className = "memo-item";
      const remind = item.remindAt
        ? "提醒 " + item.remindAt.replace("T", " ")
        : "未设置提醒";
      li.innerHTML =
        "<div><h3></h3><p></p></div><button type='button'>查看</button>";
      li.querySelector("h3").textContent = item.title;
      li.querySelector("p").textContent = TYPE_LABEL[item.type] + " · " + item.date + " · " + remind;
      li.querySelector("button").addEventListener("click", function () {
        openViewer(item);
      });
      els.list.appendChild(li);
    });
  }

  function revokeViewerUrl() {
    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl);
      currentBlobUrl = null;
    }
  }

  function openViewer(item) {
    revokeViewerUrl();
    els.viewerTitle.textContent = item.title;
    els.viewerBody.innerHTML = "";
    if (item.type === "text") {
      const p = document.createElement("p");
      p.textContent = item.text || "";
      els.viewerBody.appendChild(p);
    } else if (item.blob) {
      currentBlobUrl = URL.createObjectURL(item.blob);
      let node;
      if (item.type === "image") node = document.createElement("img");
      else if (item.type === "audio") node = document.createElement("audio");
      else node = document.createElement("video");
      node.src = currentBlobUrl;
      if (item.type !== "image") node.controls = true;
      els.viewerBody.appendChild(node);
    }
    els.viewer.classList.remove("hidden");
  }

  function closeViewer() {
    els.viewer.classList.add("hidden");
    revokeViewerUrl();
  }

  function updateTypeUi() {
    const type = els.type.value;
    const isText = type === "text";
    els.text.hidden = !isText;
    els.fileLabel.hidden = isText;
    els.file.accept = FILE_ACCEPT[type] || "";
    els.file.value = "";
    els.fileName.textContent = "";
  }

  async function loadWeather() {
    try {
      const url = "https://api.open-meteo.com/v1/forecast?latitude=32.0603&longitude=118.7969&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia%2FShanghai";
      const res = await fetch(url);
      if (!res.ok) throw new Error("weather");
      const data = await res.json();
      const cur = data.current || {};
      const desc = WEATHER_TEXT[cur.weather_code] || "天气";
      els.weather.innerHTML =
        "<strong>南京天气</strong><div>" +
        desc + " " + Math.round(cur.temperature_2m) + "℃ · 湿度 " +
        cur.relative_humidity_2m + "% · 风速 " +
        Math.round(cur.wind_speed_10m) + " km/h</div>";
    } catch (e) {
      els.weather.textContent = "南京天气暂时无法获取";
    }
  }

  function showNextReminder() {
    if (!remindQueue.length || !els.remindModal.classList.contains("hidden")) return;
    const item = remindQueue[0];
    els.remindText.textContent = "《" + item.title + "》 已到提醒时间。";
    els.remindModal.classList.remove("hidden");
  }

  function checkReminders() {
    const now = Date.now();
    memos.forEach(function (item) {
      if (!item.remindAt || item.reminded) return;
      const t = new Date(item.remindAt).getTime();
      if (t <= now && !remindQueue.some(function (x) { return x.id === item.id; })) {
        remindQueue.push(item);
      }
    });
    showNextReminder();
  }

  els.form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const type = els.type.value;
    const title = els.title.value.trim();
    if (!title) return;
    const record = {
      title: title,
      type: type,
      date: selected,
      text: type === "text" ? els.text.value : "",
      blob: null,
      mime: "",
      remindAt: els.remind.value || "",
      reminded: false,
      createdAt: Date.now()
    };
    if (type !== "text") {
      const file = els.file.files[0];
      if (!file) {
        alert("请选择要保存的文件");
        return;
      }
      record.blob = file;
      record.mime = file.type;
    }
    await saveMemo(record);
    els.form.reset();
    updateTypeUi();
  });

  els.type.addEventListener("change", updateTypeUi);
  els.fileLabel.addEventListener("click", function () { els.file.click(); });
  els.file.addEventListener("change", function () {
    els.fileName.textContent = els.file.files[0] ? " " + els.file.files[0].name : "";
  });
  els.search.addEventListener("input", renderMemos);
  document.getElementById("prev-month").addEventListener("click", function () {
    viewMonth -= 1;
    if (viewMonth < 1) {
      viewMonth = 12;
      viewYear -= 1;
    }
    renderCalendar();
  });
  document.getElementById("next-month").addEventListener("click", function () {
    viewMonth += 1;
    if (viewMonth > 12) {
      viewMonth = 1;
      viewYear += 1;
    }
    renderCalendar();
  });
  els.viewerClose.addEventListener("click", closeViewer);
  els.viewer.addEventListener("click", function (e) {
    if (e.target === els.viewer) closeViewer();
  });
  els.remindOk.addEventListener("click", async function () {
    const item = remindQueue.shift();
    els.remindModal.classList.add("hidden");
    if (item) await markReminded(item.id);
    showNextReminder();
  });

  renderCalendar();
  updateTypeUi();
  loadMemos().then(checkReminders);
  loadWeather();
  setInterval(checkReminders, 10000);
})();
