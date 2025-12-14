import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

/* =====================================
   Task Planner – FULL FILE
   - Local auth (username/password) in localStorage
   - Week grid with tasks per day
   - Weekly chart view
   - Light theme only
   - Create tasks with Start + End time (12h input), stored as 24h "HH:MM"
   - Status color dot:
       green  = completed
       gray   = no due time or > 1 hour away
       yellow = within 1 hour before due time
       red    = after due time
     NOTE: due time = endTime if present, otherwise startTime.
   - Edit modal includes:
       • Calendar date picker (full month) + month navigation arrows
       • Start/end time
       • Title
   - Backward compatible: old tasks with "time" migrated to "startTime"
   ===================================== */

const Styles = () => (
  <style>{`
    :root {
      --topPad: max(64px, 6vh);
      --bg:#f6f7f9; --card:#ffffff; --text:#0f172a; --muted:#6b7280; --border:#e5e7eb; --grid:#e5e7eb;
      --accent:#2563eb; --barOpen:#93c5fd; --barCompleted:#34d399;
    }

    *{box-sizing:border-box}
    html, body { height:100%; }
    body{
      margin:0;
      font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto;
      background:var(--bg);
      color:var(--text)
    }

    .page{
      min-height:100dvh; width:100%; max-width:100vw;
      padding:calc(var(--topPad) + env(safe-area-inset-top, 0px)) 24px 24px;
      margin:0; display:grid; gap:24px; box-sizing:border-box;
    }
    .container{
      width:100%; max-width:100%;
      display:grid; gap:24px;
      grid-template-rows: auto 1fr auto;
      grid-template-columns: minmax(0,1fr);
      justify-items:stretch; align-items:stretch;
    }

    .header{ display:flex; gap:16px; flex-wrap:wrap; align-items:center; justify-content:space-between }
    .title{ font-size:28px; font-weight:700; color:var(--text) }
    .subtle{ font-size:12px; color:var(--muted) }
    .row{ display:flex; gap:8px; align-items:center; flex-wrap:wrap }
    .btn{
      padding:8px 12px;
      border:1px solid var(--border);
      border-radius:12px;
      background:var(--card);
      cursor:pointer;
      color:var(--text);
      white-space:nowrap
    }
    .btn:hover{ box-shadow:0 1px 4px rgba(0,0,0,.12) }
    .btn.active{ background:var(--card); box-shadow:0 2px 10px rgba(0,0,0,.16) }
    .btn.primary{ background:var(--accent); color:#fff; border-color:transparent }
    .btn.sm{ padding:4px 8px; font-size:12px; border-radius:999px; }
    .btn.ghost{ background:transparent; box-shadow:none; }
    .btn:focus-visible{ outline:2px solid var(--accent); outline-offset:2px }

    .mainFill{ width:100%; height:100%; display:flex; flex-direction:column; gap:12px }

    .stats{
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
      gap:12px;
      width:100%
    }
    .card{ background:var(--card); border:1px solid var(--border); border-radius:16px; box-shadow:0 1px 6px rgba(0,0,0,.08) }
    .card.pad{ padding:16px }

    .chartWrap{ width:100%; flex:1; height:auto; min-height:0 }

    .connected{ overflow:hidden; width:100%; flex:1; display:flex; min-height:0 }
    .weekGrid{
      width:100%; flex:1; height:auto; min-height:0;
      display:grid; grid-template-columns:repeat(7,minmax(0,1fr));
      border:1px solid var(--border); border-radius:16px; background:var(--card)
    }
    .weekCol{ min-height:inherit; border-left:1px solid var(--border) }
    .weekCol:first-child{ border-left:none }

    .colInner{ display:flex; flex-direction:column; height:100%; padding:16px }
    .colHead{ display:flex; justify-content:space-between; align-items:baseline; margin-bottom:8px }
    .wk{ font-weight:600; color:var(--text) }
    .md{ font-size:12px; color:var(--muted) }

    .adder{
      width:100%; text-align:left;
      border:1px dashed var(--border); border-radius:12px;
      padding:10px 12px; font-size:14px; color:var(--muted); margin-bottom:8px; background:transparent
    }
    .adder:hover{ color:var(--text); background:rgba(0,0,0,0.02) }

    .composer{
      display:flex; flex-wrap:wrap; gap:8px; align-items:center; width:100%;
      padding:8px; border:1px solid var(--border); border-radius:12px; background:var(--card);
      margin-bottom:8px;
    }
    .composer .btn{ flex:0 0 auto }
    .input{
      border:1px solid var(--border); border-radius:12px; padding:8px; font-size:14px;
      background:var(--card); color:var(--text);
    }
    .titleInput{ flex:1 1 100%; min-width:0 }
    .input.time{ width:80px; flex:0 0 auto }
    .timeLabel{ font-size:12px; color:var(--muted); margin-right:2px }

    .task{
      display:flex; gap:12px; align-items:center;
      padding:12px; border:1px solid var(--border);
      border-radius:14px; background:var(--card)
    }
    .task + .task{ margin-top:8px }
    .circle{
      height:24px; width:24px; border:1px solid var(--border);
      border-radius:999px; display:flex; align-items:center; justify-content:center; color:var(--text)
    }
    .circle.done{ background:var(--accent); color:#fff; border-color:transparent }
    .tTitle{ font-weight:600; color:var(--text) }
    .tDone .tTitle{ text-decoration:line-through; color:var(--muted) }
    .tTime{ font-size:12px; color:var(--muted) }

    .x{
      opacity:.7; color:var(--text);
      background:transparent; border:none;
      padding:4px 6px; border-radius:8px
    }
    .x:hover{ opacity:1; background:rgba(0,0,0,0.04) }

    .statusDot{
      width:10px;
      height:10px;
      border-radius:999px;
      border:1px solid var(--border);
      flex-shrink:0;
    }

    .authWrap{ min-height:100dvh; display:flex; align-items:center; justify-content:center; background:var(--bg); padding:24px }
    .authBox{ width:360px; max-width:100%; display:grid; gap:12px }
    .authTitle{ text-align:center; font-weight:700; font-size:22px; color:var(--text) }
    .center{ text-align:center }

    /* ===== Modal ===== */
    .modalOverlay{
      position:fixed;
      inset:0;
      background:rgba(15,23,42,0.35);
      display:flex;
      align-items:center;
      justify-content:center;
      z-index:50;
    }
    .modal{
      width:420px;
      max-width:94vw;
      background:var(--card);
      border-radius:16px;
      border:1px solid var(--border);
      box-shadow:0 20px 40px rgba(15,23,42,0.35);
      padding:16px 16px 12px;
      display:grid;
      gap:12px;
    }
    .modalHeader{
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:8px;
    }
    .modalTitle{
      font-weight:600;
      font-size:16px;
    }
    .modalFooter{
      display:flex;
      justify-content:flex-end;
      gap:8px;
      margin-top:4px;
    }
    .modalRow{
      display:flex;
      flex-direction:column;
      gap:6px;
    }
    .modalLabel{
      font-size:12px;
      color:var(--muted);
    }
    .modalRowInline{
      display:flex;
      gap:8px;
      flex-wrap:wrap;
      align-items:center;
    }
    .miniSep{
      color:var(--muted);
      font-size:12px;
      padding:0 2px;
    }

    /* ===== Calendar Picker ===== */
    .calWrap{
      border:1px solid var(--border);
      border-radius:14px;
      padding:10px;
      background:var(--card);
    }
    .calHeader{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:8px;
      margin-bottom:8px;
    }
    .calMonth{
      font-weight:600;
      color:var(--text);
      font-size:14px;
    }
    .calGrid{
      display:grid;
      grid-template-columns:repeat(7, minmax(0, 1fr));
      gap:6px;
    }
    .calDow{
      font-size:11px;
      color:var(--muted);
      text-align:center;
      padding:2px 0 6px;
    }
    .calCell{
      height:34px;
      border-radius:10px;
      border:1px solid transparent;
      background:transparent;
      cursor:pointer;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:13px;
      color:var(--text);
    }
    .calCell:hover{
      background:rgba(37,99,235,0.08);
      border-color:rgba(37,99,235,0.15);
    }
    .calCell.muted{
      color:var(--muted);
      opacity:0.6;
    }
    .calCell.selected{
      background:rgba(37,99,235,0.15);
      border-color:rgba(37,99,235,0.35);
      color:var(--text);
      font-weight:600;
    }
    .calCell.today{
      border-color:rgba(15,23,42,0.18);
    }
  `}</style>
);

// ===== Helpers =====
const toMidnight = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const startOfWeek = (d) => {
  const x = toMidnight(d);
  const day = x.getDay();
  x.setDate(x.getDate() - day);
  return x;
};
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const fmtMD = (d) =>
  d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
const fmtWkday = (d) =>
  d.toLocaleDateString(undefined, { weekday: "short" });
const dateKey = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};
const parseTimeToMin = (hhmm) => {
  if (!hhmm) return 0;
  const [h, m] = (hhmm || "").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

const formatTime12 = (hhmm) => {
  if (!hhmm) return "";
  const [hRaw, mRaw] = hhmm.split(":").map(Number);
  let h = hRaw ?? 0;
  const m = mRaw ?? 0;
  let ampm = "AM";

  if (h === 0) h = 12;
  else if (h === 12) ampm = "PM";
  else if (h > 12) {
    h -= 12;
    ampm = "PM";
  }

  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
};

const formatTimeRange = (startTime, endTime) => {
  if (!startTime && !endTime) return "—";
  if (startTime && endTime)
    return `${formatTime12(startTime)} – ${formatTime12(endTime)}`;
  if (startTime) return `${formatTime12(startTime)}`;
  return `${formatTime12(endTime)}`;
};

function useNow(intervalMs = 60000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function getDueTime(task) {
  return task.endTime || task.startTime || "";
}

function getTaskColor(task, now) {
  // 1. Completed = always green
  if (task.completedAt) return "#22c55e"; // green

  const hasStart = !!task.startTime;
  const hasEnd = !!task.endTime;

  // 2. No time at all = gray
  if (!hasStart && !hasEnd) return "#9ca3af"; // gray

  try {
    const [year, month, day] = task.date.split("-").map(Number);

    const makeDate = (hhmm) => {
      const [h, m] = hhmm.split(":").map(Number);
      return new Date(year, month - 1, day, h || 0, m || 0, 0, 0);
    };

    const nowMs = now.getTime();

    // CASE A: start + end time exist
    if (hasStart && hasEnd) {
      const start = makeDate(task.startTime).getTime();
      const end = makeDate(task.endTime).getTime();

      if (nowMs >= start && nowMs <= end) return "#facc15"; // yellow
      if (nowMs > end) return "#ef4444"; // red
      return "#9ca3af"; // gray
    }

    // CASE B: only start time exists
    if (hasStart && !hasEnd) {
      const start = makeDate(task.startTime).getTime();
      const oneHourBefore = start - 60 * 60 * 1000;

      if (nowMs >= oneHourBefore && nowMs < start) return "#facc15"; // yellow
      if (nowMs >= start) return "#ef4444"; // red
      return "#9ca3af"; // gray
    }

    return "#9ca3af";
  } catch {
    return "#9ca3af";
  }
}


function split24To12(hhmm) {
  if (!hhmm) return { hour: "", minute: "", ampm: "AM" };
  const [hRaw, mRaw] = hhmm.split(":").map(Number);
  let h = hRaw ?? 0;
  const m = mRaw ?? 0;
  let ampm = "AM";
  if (h === 0) h = 12;
  else if (h === 12) ampm = "PM";
  else if (h > 12) {
    h -= 12;
    ampm = "PM";
  }
  return { hour: String(h), minute: String(m).padStart(2, "0"), ampm };
}

const to24Hour = (hStr, mStr, ampmVal) => {
  const h = parseInt(hStr || "", 10);
  const m = parseInt(mStr || "0", 10);
  if (!h) return "";
  let hours = h % 12;
  if (ampmVal === "PM") hours += 12;
  return `${String(hours).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const monthLabel = (year, monthIndex) => {
  const d = new Date(year, monthIndex, 1);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
};

const parseISOToDate = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const uid = () =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);

// ===== Auth =====
const USERS_KEY = "mini_tasks_users_v1";
const SESSION_KEY = "mini_tasks_session_v1";
function useAuth() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);
  const persist = (u) => localStorage.setItem(SESSION_KEY, JSON.stringify(u));
  const getUsers = () => {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
    } catch {
      return [];
    }
  };
  const setUsers = (arr) =>
    localStorage.setItem(USERS_KEY, JSON.stringify(arr));
  const signup = (username, password) => {
    const users = getUsers();
    if (users.find((u) => u.username === username))
      throw new Error("Username already exists");
    const next = [...users, { username, password }];
    setUsers(next);
    const s = { username };
    persist(s);
    setUser(s);
  };
  const login = (username, password) => {
    const u = getUsers().find(
      (u) => u.username === username && u.password === password
    );
    if (!u) throw new Error("Invalid username or password");
    const s = { username };
    persist(s);
    setUser(s);
  };
  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  };
  return { user, login, signup, logout };
}

// ===== Tasks =====
const tasksKeyFor = (username) => `mini_tasks_items_${username || "_anon"}`;
function useTasks(username) {
  const [tasks, setTasks] = useState([]);
  useEffect(() => {
    if (!username) {
      setTasks([]);
      return;
    }
    try {
      const raw = localStorage.getItem(tasksKeyFor(username));
      const parsed = raw ? JSON.parse(raw) : [];

      const migrated = (parsed || []).map((t) => {
        const hasNew =
          typeof t.startTime !== "undefined" || typeof t.endTime !== "undefined";
        if (hasNew) {
          return { ...t, startTime: t.startTime || "", endTime: t.endTime || "" };
        }
        return { ...t, startTime: t.time || "", endTime: "" };
      });

      setTasks(migrated);
    } catch {
      setTasks([]);
    }
  }, [username]);

  useEffect(() => {
    if (!username) return;
    try {
      localStorage.setItem(tasksKeyFor(username), JSON.stringify(tasks));
    } catch {}
  }, [tasks, username]);

  const addTask = (title, dateISO, startTimeHHMM, endTimeHHMM) => {
    if (!title.trim()) return;
    setTasks((prev) => [
      {
        id: uid(),
        title: title.trim(),
        date: dateISO,
        startTime: startTimeHHMM || "",
        endTime: endTimeHHMM || "",
        createdAt: new Date().toISOString(),
        completedAt: null,
      },
      ...prev,
    ]);
  };

  const toggleTask = (id) =>
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, completedAt: t.completedAt ? null : new Date().toISOString() }
          : t
      )
    );

  const removeTask = (id) =>
    setTasks((prev) => prev.filter((t) => t.id !== id));

  const updateTask = (id, updater) =>
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? updater({ ...t }) : t))
    );

  return { tasks, addTask, toggleTask, removeTask, updateTask };
}

/* ===== Calendar Picker Component =====
   - Shows full month grid
   - Prev/Next month arrows
   - Click a day to select
   - Includes trailing days from prev/next month (muted)
*/
function CalendarPicker({ valueISO, onChangeISO }) {
  const selectedDate = useMemo(() => parseISOToDate(valueISO), [valueISO]);
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth()); // 0-11

  // Keep view synced when selecting a date from a different month
  useEffect(() => {
    setViewYear(selectedDate.getFullYear());
    setViewMonth(selectedDate.getMonth());
  }, [selectedDate]);

  const today = useMemo(() => toMidnight(new Date()), []);

  const goPrev = () => {
    const d = new Date(viewYear, viewMonth - 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };
  const goNext = () => {
    const d = new Date(viewYear, viewMonth + 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const gridDates = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startDay = firstOfMonth.getDay(); // 0 Sun
    const gridStart = new Date(viewYear, viewMonth, 1 - startDay);

    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      d.setHours(0, 0, 0, 0);
      return d;
    });
  }, [viewYear, viewMonth]);

  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="calWrap">
      <div className="calHeader">
        <button type="button" className="btn sm ghost" onClick={goPrev} aria-label="Previous month">
          ←
        </button>
        <div className="calMonth">{monthLabel(viewYear, viewMonth)}</div>
        <button type="button" className="btn sm ghost" onClick={goNext} aria-label="Next month">
          →
        </button>
      </div>

      <div className="calGrid" style={{ marginBottom: 6 }}>
        {dow.map((d) => (
          <div key={d} className="calDow">{d}</div>
        ))}
      </div>

      <div className="calGrid">
        {gridDates.map((d) => {
          const muted = d.getMonth() !== viewMonth;
          const selected = isSameDay(d, selectedDate);
          const isToday = isSameDay(d, today);
          const cls = [
            "calCell",
            muted ? "muted" : "",
            selected ? "selected" : "",
            isToday ? "today" : "",
          ].filter(Boolean).join(" ");

          return (
            <button
              key={d.toISOString()}
              type="button"
              className={cls}
              onClick={() => onChangeISO(dateKey(d))}
              title={d.toLocaleDateString()}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ===== Edit Task Modal =====
function EditTaskModal({ task, onSave, onClose }) {
  const [title, setTitle] = useState(task.title);
  const [dateISO, setDateISO] = useState(task.date);

  const startSplit = split24To12(task.startTime || "");
  const endSplit = split24To12(task.endTime || "");

  const [sHour, setSHour] = useState(startSplit.hour);
  const [sMinute, setSMinute] = useState(startSplit.minute);
  const [sAmpm, setSAmpm] = useState(startSplit.ampm);

  const [eHour, setEHour] = useState(endSplit.hour);
  const [eMinute, setEMinute] = useState(endSplit.minute);
  const [eAmpm, setEAmpm] = useState(endSplit.ampm);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    const startTime = sHour ? to24Hour(sHour, sMinute, sAmpm) : "";
    const endTime = eHour ? to24Hour(eHour, eMinute, eAmpm) : "";

    onSave({
      title: trimmed,
      date: dateISO,
      startTime,
      endTime,
    });
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target.classList.contains("modalOverlay")) onClose();
  };

  return (
    <div className="modalOverlay" onMouseDown={handleBackdropClick}>
      <form className="modal" onSubmit={handleSubmit}>
        <div className="modalHeader">
          <div className="modalTitle">Edit task</div>
          <button type="button" className="x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modalRow">
          <span className="modalLabel">Title</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </div>

        <div className="modalRow">
          <span className="modalLabel">Date</span>
          <CalendarPicker valueISO={dateISO} onChangeISO={setDateISO} />
        </div>

        <div className="modalRow">
          <span className="modalLabel">Start time (optional)</span>
          <div className="modalRowInline">
            <input className="input time" type="number" min="1" max="12" placeholder="HH" value={sHour} onChange={(e) => setSHour(e.target.value)} />
            <input className="input time" type="number" min="0" max="59" placeholder="MM" value={sMinute} onChange={(e) => setSMinute(e.target.value)} />
            <select className="input time" value={sAmpm} onChange={(e) => setSAmpm(e.target.value)}>
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
            <button type="button" className="btn sm ghost" onClick={() => { setSHour(""); setSMinute(""); setSAmpm("AM"); }}>
              Clear
            </button>
          </div>
        </div>

        <div className="modalRow">
          <span className="modalLabel">End time (optional)</span>
          <div className="modalRowInline">
            <input className="input time" type="number" min="1" max="12" placeholder="HH" value={eHour} onChange={(e) => setEHour(e.target.value)} />
            <input className="input time" type="number" min="0" max="59" placeholder="MM" value={eMinute} onChange={(e) => setEMinute(e.target.value)} />
            <select className="input time" value={eAmpm} onChange={(e) => setEAmpm(e.target.value)}>
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
            <button type="button" className="btn sm ghost" onClick={() => { setEHour(""); setEMinute(""); setEAmpm("AM"); }}>
              Clear
            </button>
          </div>
        </div>

        <div className="modalFooter">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" type="submit">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

// ===== Day Column =====
function DayColumn({ date, items, onAdd, onToggle, onRemove, onEdit, now }) {
  const [isComposing, setIsComposing] = useState(false);
  const [title, setTitle] = useState("");

  const [sHour, setSHour] = useState("");
  const [sMinute, setSMinute] = useState("");
  const [sAmpm, setSAmpm] = useState("AM");

  const [eHour, setEHour] = useState("");
  const [eMinute, setEMinute] = useState("");
  const [eAmpm, setEAmpm] = useState("AM");

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const aDone = a.completedAt ? 1 : 0;
      const bDone = b.completedAt ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;

      const aSortTime = a.startTime || getDueTime(a) || "";
      const bSortTime = b.startTime || getDueTime(b) || "";
      const t = parseTimeToMin(aSortTime) - parseTimeToMin(bSortTime);
      if (t !== 0) return t;

      return (a.createdAt || "").localeCompare(b.createdAt || "");
    });
  }, [items]);

  const cancel = () => {
    setIsComposing(false);
    setTitle("");
    setSHour("");
    setSMinute("");
    setSAmpm("AM");
    setEHour("");
    setEMinute("");
    setEAmpm("AM");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const startTime = sHour ? to24Hour(sHour, sMinute, sAmpm) : "";
    const endTime = eHour ? to24Hour(eHour, eMinute, eAmpm) : "";
    onAdd(title, dateKey(date), startTime, endTime);
    cancel();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  };

  return (
    <div className="colInner">
      <div className="colHead">
        <div className="wk">{fmtWkday(date)}</div>
        <div className="md">{fmtMD(date)}</div>
      </div>

      {!isComposing ? (
        <button className="adder" onClick={() => setIsComposing(true)} title="Add a task to this day">
          + Click to add a task
        </button>
      ) : (
        <form className="composer" onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
          <input
            className="input titleInput"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title..."
            autoFocus
          />

          <span className="timeLabel">Start:</span>
          <input className="input time" type="number" min="1" max="12" placeholder="HH" value={sHour} onChange={(e) => setSHour(e.target.value)} />
          <input className="input time" type="number" min="0" max="59" placeholder="MM" value={sMinute} onChange={(e) => setSMinute(e.target.value)} />
          <select className="input time" value={sAmpm} onChange={(e) => setSAmpm(e.target.value)}>
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>

          <span className="miniSep">•</span>

          <span className="timeLabel">End:</span>
          <input className="input time" type="number" min="1" max="12" placeholder="HH" value={eHour} onChange={(e) => setEHour(e.target.value)} />
          <input className="input time" type="number" min="0" max="59" placeholder="MM" value={eMinute} onChange={(e) => setEMinute(e.target.value)} />
          <select className="input time" value={eAmpm} onChange={(e) => setEAmpm(e.target.value)}>
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>

          <button className="btn primary" type="submit">Add</button>
          <button className="btn" type="button" onClick={cancel}>Cancel</button>
        </form>
      )}

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        <AnimatePresence initial={false}>
          {sorted.map((t) => (
            <motion.li
              key={t.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`task ${t.completedAt ? "tDone" : ""}`}
            >
              <button
                className={`circle ${t.completedAt ? "done" : ""}`}
                onClick={(e) => { e.stopPropagation(); onToggle(t.id); }}
                aria-label={t.completedAt ? "Mark as incomplete" : "Mark as complete"}
              >
                {t.completedAt ? "✓" : ""}
              </button>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="tTitle" title={t.title}>{t.title}</div>
                <div className="tTime">{formatTimeRange(t.startTime, t.endTime)}</div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                <div className="statusDot" title="Status" style={{ backgroundColor: getTaskColor(t, now) }} />
                <button type="button" className="btn sm ghost" onClick={() => onEdit(t)}>Edit</button>
                <button className="x" onClick={(e) => { e.stopPropagation(); onRemove(t.id); }} title="Delete">✕</button>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>

        {sorted.length === 0 && (
          <div className="card pad" style={{ textAlign: "center", color: "var(--muted)" }}>
            No tasks yet
          </div>
        )}
      </ul>
    </div>
  );
}

// ===== Auth View =====
function AuthView({ mode: initialMode = "login", onLogin, onSignup }) {
  const [mode, setMode] = useState(initialMode);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const submit = (e) => {
    e.preventDefault();
    setError("");
    try {
      if (mode === "login") onLogin(username.trim(), password);
      else onSignup(username.trim(), password);
    } catch (err) {
      setError(err.message || String(err));
    }
  };
  return (
    <div className="authWrap">
      <div className="authBox">
        <div className="authTitle">Task Planner – Sign {mode === "login" ? "In" : "Up"}</div>
        <div className="center subtle">Demo auth (local only). Do not use real credentials.</div>
        <div className="card pad">
          <form onSubmit={submit} style={{ display: "grid", gap: 8 }}>
            <label style={{ display: "grid", gap: 4 }}>
              <span className="subtle">Username</span>
              <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="yourname" required />
            </label>
            <label style={{ display: "grid", gap: 4 }}>
              <span className="subtle">Password</span>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </label>
            {error && <div style={{ color: "#dc2626", fontSize: 14 }}>{error}</div>}
            <button className="btn primary" type="submit" style={{ width: "100%" }}>
              {mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>
        </div>
        <div className="center subtle">
          {mode === "login" ? (
            <span>New here? <button className="btn" onClick={() => setMode("signup")}>Create an account</button></span>
          ) : (
            <span>Have an account? <button className="btn" onClick={() => setMode("login")}>Sign in</button></span>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Planner =====
function Planner({ username, onLogout }) {
  const { tasks, addTask, toggleTask, removeTask, updateTask } = useTasks(username);
  const [weekOffset, setWeekOffset] = useState(0);
  const [view, setView] = useState("chart");
  const now = useNow(60000);

  const [editingTask, setEditingTask] = useState(null);

  const base = useMemo(() => startOfWeek(new Date()), []);
  const weekStart = useMemo(() => addDays(base, weekOffset * 7), [base, weekOffset]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const grouped = useMemo(() => {
    const map = new Map();
    weekDays.forEach((d) => map.set(dateKey(d), []));
    tasks.forEach((t) => {
      if (map.has(t.date)) map.get(t.date).push(t);
    });
    return map;
  }, [tasks, weekDays]);

  const chartData = useMemo(
    () =>
      weekDays.map((d) => {
        const key = dateKey(d);
        const dayTasks = grouped.get(key) || [];
        const completed = dayTasks.filter((t) => t.completedAt).length;
        const open = dayTasks.length - completed;
        return { label: fmtWkday(d), date: fmtMD(d), open, completed, total: dayTasks.length };
      }),
    [grouped, weekDays]
  );

  const chartTotals = useMemo(
    () =>
      chartData.reduce(
        (a, d) => ({ open: a.open + d.open, completed: a.completed + d.completed, total: a.total + d.total }),
        { open: 0, completed: 0, total: 0 }
      ),
    [chartData]
  );

  const weekLabel = `${fmtMD(weekDays[0])} – ${fmtMD(weekDays[6])}`;

  const handleEditSave = (changes) => {
    if (!editingTask) return;
    updateTask(editingTask.id, (prev) => ({ ...prev, ...changes }));
  };

  return (
    <>
      <div className="page">
        <div className="container">
          <div className="header">
            <div>
              <div className="title">Planner</div>
              <div className="subtle">Week of {weekLabel}</div>
            </div>

            <div className="row">
              <button className="btn" onClick={() => setWeekOffset(weekOffset - 1)}>← Prev</button>
              <button className="btn" onClick={() => setWeekOffset(0)}>This Week</button>
              <button className="btn" onClick={() => setWeekOffset(weekOffset + 1)}>Next →</button>
            </div>

            <div className="row">
              <button className={`btn ${view === "chart" ? "active" : ""}`} onClick={() => setView("chart")}>Chart</button>
              <button className={`btn ${view === "week" ? "active" : ""}`} onClick={() => setView("week")}>Week</button>
            </div>

            <div className="row">
              <div className="subtle">Signed in as <b>{username}</b></div>
              <button className="btn" onClick={onLogout}>Log out</button>
            </div>
          </div>

          {view === "chart" ? (
            <div className="mainFill">
              <div className="stats">
                <div className="card pad"><div className="subtle">Open</div><div style={{ fontSize: 22, fontWeight: 700 }}>{chartTotals.open}</div></div>
                <div className="card pad"><div className="subtle">Completed</div><div style={{ fontSize: 22, fontWeight: 700 }}>{chartTotals.completed}</div></div>
                <div className="card pad"><div className="subtle">Total</div><div style={{ fontSize: 22, fontWeight: 700 }}>{chartTotals.total}</div></div>
              </div>

              <div className="card chartWrap">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ left: 16, right: 16, top: 40, bottom: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
                    <XAxis dataKey="label" tick={{ fill: "var(--text)" }} stroke="var(--border)" />
                    <YAxis allowDecimals={false} tick={{ fill: "var(--text)" }} stroke="var(--border)" />
                    <Tooltip formatter={(v, n, p) => [String(v), `${p.payload.date}`]} />
                    <Legend wrapperStyle={{ color: "var(--text)" }} />
                    <Bar dataKey="completed" stackId="a" name="Completed" radius={[8, 8, 0, 0]} fill="var(--barCompleted)" />
                    <Bar dataKey="open" stackId="a" name="Open" fill="var(--barOpen)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="mainFill">
              <div className="connected">
                <div className="weekGrid">
                  {weekDays.map((d) => (
                    <div key={dateKey(d)} className="weekCol">
                      <DayColumn
                        date={d}
                        items={grouped.get(dateKey(d)) || []}
                        onAdd={addTask}
                        onToggle={toggleTask}
                        onRemove={removeTask}
                        onEdit={(task) => setEditingTask(task)}
                        now={now}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="center subtle" style={{ padding: "12px 0" }}>
            All data is stored locally in your browser. Do not use real passwords.
          </div>
        </div>
      </div>

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onSave={handleEditSave}
          onClose={() => setEditingTask(null)}
        />
      )}
    </>
  );
}

// ===== Root App =====
export default function App() {
  const { user, login, signup, logout } = useAuth();
  return (
    <>
      <Styles />
      {!user ? <AuthView onLogin={login} onSignup={signup} /> : <Planner username={user.username} onLogout={logout} />}
    </>
  );
}
