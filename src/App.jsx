import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// --- Types ---
/** @typedef {{ id: string; title: string; createdAt: string; completedAt?: string | null; }} Task */

// --- Utilities ---
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const todayISO = () => new Date().toISOString();

const startOfDay = (d) => {
  const nd = new Date(d);
  nd.setHours(0,0,0,0);
  return nd;
};

const isSameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime();

const lastNDates = (n) => {
  const out = [];
  const base = startOfDay(new Date());
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    out.push(d);
  }
  return out;
};

const weekdayShort = (d) => d.toLocaleDateString(undefined, { weekday: "short" });
const monthDay = (d) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

// --- Storage Hook ---
const STORAGE_KEY = "gtasks_mini_v1";

function useTasks() {
  const [tasks, setTasks] = useState(/** @type {Task[]} */([]));

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setTasks(JSON.parse(raw));
    } catch (e) {
      console.warn("Failed to load tasks", e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
      console.warn("Failed to save tasks", e);
    }
  }, [tasks]);

  const addTask = (title) => {
    if (!title.trim()) return;
    setTasks((prev) => [{ id: uid(), title: title.trim(), createdAt: todayISO(), completedAt: null }, ...prev]);
  };

  const toggleTask = (id) => {
    setTasks((prev) => prev.map((t) => t.id === id ? ({
      ...t,
      completedAt: t.completedAt ? null : new Date().toISOString(),
    }) : t));
  };

  const removeTask = (id) => setTasks((prev) => prev.filter((t) => t.id !== id));

  const clearCompleted = () => setTasks((prev) => prev.filter((t) => !t.completedAt));

  return { tasks, addTask, toggleTask, removeTask, clearCompleted, setTasks };
}

// --- Weekly Report ---
function useWeeklyReport(tasks) {
  const days = useMemo(() => lastNDates(7), []);
  const data = useMemo(() => {
    return days.map((d) => {
      const count = tasks.filter((t) => t.completedAt && isSameDay(new Date(t.completedAt), d)).length;
      return {
        label: weekdayShort(d),
        date: monthDay(d),
        count,
      };
    });
  }, [tasks, days]);

  const totals = useMemo(() => {
    const created = tasks.filter((t) => new Date(t.createdAt) >= startOfDay(new Date(Date.now() - 6*24*3600*1000))).length;
    const completed = data.reduce((acc, d) => acc + d.count, 0);
    const rate = created ? Math.round((completed / created) * 100) : 0;
    return { created, completed, rate };
  }, [tasks, data]);

  return { data, totals };
}

// --- UI Controls ---
const TextInput = ({ value, onChange, onSubmit, placeholder }) => (
  <form
    onSubmit={(e) => { e.preventDefault(); onSubmit?.(); }}
    className="flex gap-2"
  >
    <input
      className="flex-1 rounded-2xl border px-4 py-3 outline-none shadow-sm focus:ring-2"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
    <button
      type="submit"
      className="rounded-2xl px-4 py-3 shadow-sm border hover:shadow transition"
    >Add</button>
  </form>
);

const Stat = ({ label, value, sub }) => (
  <div className="p-4 rounded-2xl border shadow-sm">
    <div className="text-sm opacity-70">{label}</div>
    <div className="text-2xl font-semibold">{value}</div>
    {sub && <div className="text-xs opacity-60 mt-1">{sub}</div>}
  </div>
);

// --- Task Item ---
const TaskItem = ({ task, onToggle, onRemove }) => (
  <motion.li
    layout
    key={task.id}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    className="flex items-center gap-3 p-3 rounded-2xl border shadow-sm"
  >
    <button
      className={`h-6 w-6 rounded-full border flex items-center justify-center ${task.completedAt ? "bg-black text-white" : ""}`}
      onClick={() => onToggle(task.id)}
      aria-label={task.completedAt ? "Mark as incomplete" : "Mark as complete"}
    >
      {task.completedAt ? "✓" : ""}
    </button>
    <div className={`flex-1 ${task.completedAt ? "line-through opacity-60" : ""}`}>
      {task.title}
    </div>
    <button
      onClick={() => onRemove(task.id)}
      className="text-sm opacity-60 hover:opacity-100"
      aria-label="Delete task"
      title="Delete"
    >
      ✕
    </button>
  </motion.li>
);

// --- Main App ---
export default function App() {
  const { tasks, addTask, toggleTask, removeTask, clearCompleted } = useTasks();
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState("all"); // all | open | done
  const { data, totals } = useWeeklyReport(tasks);

  const visibleTasks = useMemo(() => {
    if (filter === "open") return tasks.filter((t) => !t.completedAt);
    if (filter === "done") return tasks.filter((t) => t.completedAt);
    return tasks;
  }, [tasks, filter]);

  const handleAdd = () => {
    addTask(input);
    setInput("");
  };

  return (
    <div className="min-h-screen w-full bg-gray-50/50 flex justify-center p-6">
      <div className="w-full max-w-4xl grid gap-6">
        {/* Header */}
        <header className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold">Tasks</h1>
            <p className="opacity-70">A tiny Google Tasks–like app with a weekly report</p>
          </div>
          <div className="flex gap-2">
            <button className={`px-3 py-2 rounded-xl border ${filter==='all'? 'bg-white shadow': ''}`} onClick={() => setFilter('all')}>All</button>
            <button className={`px-3 py-2 rounded-xl border ${filter==='open'? 'bg-white shadow': ''}`} onClick={() => setFilter('open')}>Open</button>
            <button className={`px-3 py-2 rounded-xl border ${filter==='done'? 'bg-white shadow': ''}`} onClick={() => setFilter('done')}>Done</button>
          </div>
        </header>

        {/* Create */}
        <section className="grid gap-3">
          <TextInput
            value={input}
            onChange={setInput}
            onSubmit={handleAdd}
            placeholder="Add a task and hit Enter…"
          />
          <div className="flex items-center gap-3 text-sm">
            <button onClick={clearCompleted} className="rounded-xl px-3 py-2 border hover:shadow">Clear completed</button>
            <div className="opacity-70">{tasks.filter(t=>!t.completedAt).length} open · {tasks.filter(t=>t.completedAt).length} done</div>
          </div>
        </section>

        {/* List */}
        <section className="grid gap-3">
          <ul className="grid gap-2">
            <AnimatePresence initial={false}>
              {visibleTasks.map((t) => (
                <TaskItem key={t.id} task={t} onToggle={toggleTask} onRemove={removeTask} />
              ))}
            </AnimatePresence>
          </ul>
          {visibleTasks.length === 0 && (
            <div className="text-center opacity-60 border rounded-2xl p-6">No tasks here. Add one above!</div>
          )}
        </section>

        {/* Weekly Report */}
        <section className="grid gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Weekly Report (last 7 days)</h2>
            <div className="flex gap-3">
              <Stat label="Created" value={totals.created} />
              <Stat label="Completed" value={totals.completed} />
              <Stat label="Completion" value={`${totals.rate}%`} sub="of tasks created this week" />
            </div>
          </div>
          <div className="h-64 w-full rounded-2xl border shadow-sm p-3 bg-white">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={(v, n, p) => [`${v} completed`, `${p.payload.date}`]} />
                <Bar dataKey="count" radius={[8,8,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-xs opacity-60 text-center py-6">
          Data is stored locally in your browser (no server). Refresh-safe.
        </footer>
      </div>
    </div>
  );
}
