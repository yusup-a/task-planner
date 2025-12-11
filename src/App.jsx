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
   Mini Tasks Planner – FULL FILE
   - Local auth (username/password) in localStorage
   - Week grid with tasks per day
   - Weekly chart view
   - Light theme only
   - Task creation with 12h time (HH:MM + AM/PM)
   - Status color dot:
       gray  = no time or > 1 hour away
       yellow = within 1 hour before time
       red    = after time
   - NEW:
       • Cleaner task UI (only color dot + Edit + Delete)
       • Edit modal to change title, day (within week), and time
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
      grid-template-rows: auto 1fr auto;          /* header / main / footer */
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

    /* Add task CTA + Composer (WRAPS TO 2 ROWS) */
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
    .titleInput{ flex:1 1 100%; min-width:0 }   /* full-width first row */

    /* time inputs share this class */
    .input.time{ width:80px; flex:0 0 auto }

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

    /* Status color dot */
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
      width:360px;
      max-width:90vw;
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
      gap:4px;
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

// Format 24h -> "h:mm AM/PM" for display
const formatTime12 = (hhmm) => {
  if (!hhmm) return "";
  const [hRaw, mRaw] = hhmm.split(":").map(Number);
  let h = hRaw ?? 0;
  const m = mRaw ?? 0;
  let ampm = "AM";

  if (h === 0) {
    h = 12;
  } else if (h === 12) {
    ampm = "PM";
  } else if (h > 12) {
    h -= 12;
    ampm = "PM";
  }

  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
};

// LIVE clock hook (for color updates)
function useNow(intervalMs = 60000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

// Compute status color for a task
function getTaskColor(task, now) {
  // No time => always gray
  if (!task.time) return "#9ca3af"; // gray

  try {
    const [year, month, day] = task.date.split("-").map(Number);
    const [h, m] = task.time.split(":").map(Number);
    const due = new Date(year, month - 1, day, h || 0, m || 0, 0, 0);
    const diffMinutes = (due.getTime() - now.getTime()) / 60000;

    if (diffMinutes <= 0) {
      // Past due
      return "#ef4444"; // red
    }
    if (diffMinutes <= 60) {
      // Within 1 hour
      return "#facc15"; // yellow
    }
    return "#9ca3af"; // more than an hour away
  } catch {
    return "#9ca3af";
  }
}

// Convert 24h "HH:MM" string -> { hour: "1-12", minute: "00-59", ampm }
function split24To12(hhmm) {
  if (!hhmm) return { hour: "", minute: "", ampm: "AM" };
  const [hRaw, mRaw] = hhmm.split(":").map(Number);
  let h = hRaw ?? 0;
  const m = mRaw ?? 0;
  let ampm = "AM";
  if (h === 0) {
    h = 12;
  } else if (h === 12) {
    ampm = "PM";
  } else if (h > 12) {
    h -= 12;
    ampm = "PM";
  }
  return {
    hour: String(h),
    minute: String(m).padStart(2, "0"),
    ampm,
  };
}

// Types
/** @typedef {{ id: string; title: string; date: string; time: string; createdAt: string; completedAt?: string|null; }} Task */
const uid = () =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);

// ===== Auth (localStorage) =====
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

// ===== Tasks (localStorage per user) =====
const tasksKeyFor = (username) => `mini_tasks_items_${username || "_anon"}`;
function useTasks(username) {
  const [tasks, setTasks] = useState(/** @type {Task[]} */ ([]));
  useEffect(() => {
    if (!username) {
      setTasks([]);
      return;
    }
    try {
      const raw = localStorage.getItem(tasksKeyFor(username));
      setTasks(raw ? JSON.parse(raw) : []);
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

  const addTask = (title, dateISO, timeHHMM) => {
    if (!title.trim()) return;
    setTasks((prev) => [
      {
        id: uid(),
        title: title.trim(),
        date: dateISO,
        time: timeHHMM || "",
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

// ===== Edit Task Modal =====
function EditTaskModal({ task, weekDays, onSave, onClose }) {
  const [title, setTitle] = useState(task.title);
  const [dateKeyValue, setDateKeyValue] = useState(task.date);

  const { hour: initialHour, minute: initialMinute, ampm: initialAmpm } =
    split24To12(task.time);
  const [hour, setHour] = useState(initialHour);
  const [minute, setMinute] = useState(initialMinute);
  const [ampm, setAmpm] = useState(initialAmpm);

  const to24Hour = (hStr, mStr, ampmVal) => {
    const h = parseInt(hStr || "", 10);
    const m = parseInt(mStr || "0", 10);
    if (!h) return ""; // allow blank time
    let hours = h % 12;
    if (ampmVal === "PM") hours += 12;
    return `${String(hours).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    const timeValue = hour ? to24Hour(hour, minute, ampm) : "";

    onSave({
      title: trimmed,
      date: dateKeyValue,
      time: timeValue,
    });
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target.classList.contains("modalOverlay")) {
      onClose();
    }
  };

  const opts = weekDays.map((d) => ({
    key: dateKey(d),
    label: `${fmtWkday(d)} ${fmtMD(d)}`,
  }));

  return (
    <div className="modalOverlay" onMouseDown={handleBackdropClick}>
      <form className="modal" onSubmit={handleSubmit}>
        <div className="modalHeader">
          <div className="modalTitle">Edit task</div>
          <button
            type="button"
            className="x"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="modalRow">
          <span className="modalLabel">Title</span>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>

        <div className="modalRow">
          <span className="modalLabel">Day (this week)</span>
          <select
            className="input"
            value={dateKeyValue}
            onChange={(e) => setDateKeyValue(e.target.value)}
          >
            {opts.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="modalRow">
          <span className="modalLabel">Time (optional)</span>
          <div className="modalRowInline">
            <input
              className="input time"
              type="number"
              min="1"
              max="12"
              placeholder="HH"
              value={hour}
              onChange={(e) => setHour(e.target.value)}
            />
            <input
              className="input time"
              type="number"
              min="0"
              max="59"
              placeholder="MM"
              value={minute}
              onChange={(e) => setMinute(e.target.value)}
            />
            <select
              className="input time"
              value={ampm}
              onChange={(e) => setAmpm(e.target.value)}
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
            <button
              type="button"
              className="btn sm ghost"
              onClick={() => {
                setHour("");
                setMinute("");
              }}
            >
              Clear time
            </button>
          </div>
        </div>

        <div className="modalFooter">
          <button
            type="button"
            className="btn ghost"
            onClick={onClose}
          >
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
function DayColumn({
  date,
  items,
  onAdd,
  onToggle,
  onRemove,
  onEdit,
  now,
}) {
  const [isComposing, setIsComposing] = useState(false);
  const [title, setTitle] = useState("");

  // 12-hour time inputs for new task
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [ampm, setAmpm] = useState("AM");

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const aDone = a.completedAt ? 1 : 0,
        bDone = b.completedAt ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      const t = parseTimeToMin(a.time) - parseTimeToMin(b.time);
      if (t !== 0) return t;
      return (a.createdAt || "").localeCompare(b.createdAt || "");
    });
  }, [items]);

  const cancel = () => {
    setIsComposing(false);
    setTitle("");
    setHour("");
    setMinute("");
    setAmpm("AM");
  };

  // Convert 12h -> 24h "HH:MM"
  const to24Hour = (hStr, mStr, ampmVal) => {
    const h = parseInt(hStr || "", 10);
    const m = parseInt(mStr || "0", 10);
    if (!h) return ""; // allow blank time

    let hours = h % 12;
    if (ampmVal === "PM") hours += 12;
    return `${String(hours).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const timeValue = hour ? to24Hour(hour, minute, ampm) : "";
    onAdd(title, dateKey(date), timeValue);
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
        <button
          className="adder"
          onClick={() => setIsComposing(true)}
          title="Add a task to this day"
        >
          + Click to add a task
        </button>
      ) : (
        <form
          className="composer"
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
        >
          {/* Row 1: Title (full width) */}
          <input
            className="input titleInput"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title..."
            autoFocus
          />

          {/* Row 2: Time (12h) + Buttons */}
          <input
            className="input time"
            type="number"
            min="1"
            max="12"
            placeholder="HH"
            value={hour}
            onChange={(e) => setHour(e.target.value)}
          />
          <input
            className="input time"
            type="number"
            min="0"
            max="59"
            placeholder="MM"
            value={minute}
            onChange={(e) => setMinute(e.target.value)}
          />
          <select
            className="input time"
            value={ampm}
            onChange={(e) => setAmpm(e.target.value)}
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>

          <button className="btn primary" type="submit">
            Add
          </button>
          <button className="btn" type="button" onClick={cancel}>
            Cancel
          </button>
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
              {/* Left: complete toggle */}
              <button
                className={`circle ${t.completedAt ? "done" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(t.id);
                }}
                aria-label={
                  t.completedAt ? "Mark as incomplete" : "Mark as complete"
                }
              >
                {t.completedAt ? "✓" : ""}
              </button>

              {/* Middle: title + time */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="tTitle" title={t.title}>
                  {t.title}
                </div>
                <div className="tTime">
                  {t.time ? formatTime12(t.time) : "—"}
                </div>
              </div>

              {/* Right: status dot + buttons */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 6,
                }}
              >
                <div
                  className="statusDot"
                  title="Time status"
                  style={{ backgroundColor: getTaskColor(t, now) }}
                />
                <button
                  type="button"
                  className="btn sm ghost"
                  onClick={() => onEdit(t)}
                >
                  Edit
                </button>
                <button
                  className="x"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(t.id);
                  }}
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
        {sorted.length === 0 && (
          <div
            className="card pad"
            style={{ textAlign: "center", color: "var(--muted)" }}
          >
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
        <div className="authTitle">
          Mini Tasks – Sign {mode === "login" ? "In" : "Up"}
        </div>
        <div className="center subtle">
          Demo auth (local only). Do not use real credentials.
        </div>
        <div className="card pad">
          <form onSubmit={submit} style={{ display: "grid", gap: 8 }}>
            <label style={{ display: "grid", gap: 4 }}>
              <span className="subtle">Username</span>
              <input
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="yourname"
                required
              />
            </label>
            <label style={{ display: "grid", gap: 4 }}>
              <span className="subtle">Password</span>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </label>
            {error && (
              <div style={{ color: "#dc2626", fontSize: 14 }}>{error}</div>
            )}
            <button
              className="btn primary"
              type="submit"
              style={{ width: "100%" }}
            >
              {mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>
        </div>
        <div className="center subtle">
          {mode === "login" ? (
            <span>
              New here?{" "}
              <button className="btn" onClick={() => setMode("signup")}>
                Create an account
              </button>
            </span>
          ) : (
            <span>
              Have an account?{" "}
              <button className="btn" onClick={() => setMode("login")}>
                Sign in
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Planner (main signed-in UI) =====
function Planner({ username, onLogout }) {
  const { tasks, addTask, toggleTask, removeTask, updateTask } = useTasks(username);
  const [weekOffset, setWeekOffset] = useState(0);
  const [view, setView] = useState("chart");
  const now = useNow(60000); // update every minute

  const [editingTask, setEditingTask] = useState(null); // Task or null

  const base = useMemo(() => startOfWeek(new Date()), []);
  const weekStart = useMemo(
    () => addDays(base, weekOffset * 7),
    [base, weekOffset]
  );
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

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
        return {
          label: fmtWkday(d),
          date: fmtMD(d),
          open,
          completed,
          total: dayTasks.length,
        };
      }),
    [grouped, weekDays]
  );

  const chartTotals = useMemo(
    () =>
      chartData.reduce(
        (a, d) => ({
          open: a.open + d.open,
          completed: a.completed + d.completed,
          total: a.total + d.total,
        }),
        { open: 0, completed: 0, total: 0 }
      ),
    [chartData]
  );

  const weekLabel = `${fmtMD(weekDays[0])} – ${fmtMD(weekDays[6])}`;

  const handleEditSave = (changes) => {
    if (!editingTask) return;
    updateTask(editingTask.id, (prev) => ({
      ...prev,
      ...changes,
    }));
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
              <button
                className="btn"
                onClick={() => setWeekOffset(weekOffset - 1)}
              >
                ← Prev
              </button>
              <button className="btn" onClick={() => setWeekOffset(0)}>
                This Week
              </button>
              <button
                className="btn"
                onClick={() => setWeekOffset(weekOffset + 1)}
              >
                Next →
              </button>
            </div>
            <div className="row">
              <button
                className={`btn ${view === "chart" ? "active" : ""}`}
                onClick={() => setView("chart")}
              >
                Chart
              </button>
              <button
                className={`btn ${view === "week" ? "active" : ""}`}
                onClick={() => setView("week")}
              >
                Week
              </button>
            </div>
            <div className="row">
              <div className="subtle">
                Signed in as <b>{username}</b>
              </div>
              <button className="btn" onClick={onLogout}>
                Log out
              </button>
            </div>
          </div>

          {view === "chart" ? (
            <div className="mainFill">
              <div className="stats">
                <div className="card pad">
                  <div className="subtle">Open</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>
                    {chartTotals.open}
                  </div>
                </div>
                <div className="card pad">
                  <div className="subtle">Completed</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>
                    {chartTotals.completed}
                  </div>
                </div>
                <div className="card pad">
                  <div className="subtle">Total</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>
                    {chartTotals.total}
                  </div>
                </div>
              </div>
              <div className="card chartWrap">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ left: 16, right: 16, top: 40, bottom: 16 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--grid)"
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "var(--text)" }}
                      stroke="var(--border)"
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "var(--text)" }}
                      stroke="var(--border)"
                    />
                    <Tooltip
                      formatter={(v, n, p) => [
                        String(v),
                        `${p.payload.date}`,
                      ]}
                    />
                    <Legend wrapperStyle={{ color: "var(--text)" }} />
                    <Bar
                      dataKey="completed"
                      stackId="a"
                      name="Completed"
                      radius={[8, 8, 0, 0]}
                      fill="var(--barCompleted)"
                    />
                    <Bar
                      dataKey="open"
                      stackId="a"
                      name="Open"
                      fill="var(--barOpen)"
                    />
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
            All data is stored locally in your browser. Do not use real
            passwords.
          </div>
        </div>
      </div>

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          weekDays={weekDays}
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
      {!user ? (
        <AuthView onLogin={login} onSignup={signup} />
      ) : (
        <Planner username={user.username} onLogout={logout} />
      )}
    </>
  );
}
