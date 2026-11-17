import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckSquare, 
  Square, 
  Plus, 
  Trash2, 
  Calendar, 
  BookOpen, 
  Clock, 
  Sparkles,
  Lock,
  CheckCircle2
} from 'lucide-react';

export default function CoverApp({ onUnlockSecretGate }) {
  // Functional To-Do list so it's a 100% convincing deceptive cover
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Review quarterly architecture roadmap', completed: true, tag: 'Work' },
    { id: 2, text: 'Renew cloud storage subscription', completed: false, tag: 'Finance' },
    { id: 3, text: 'Read 20 pages of System Design interview guide', completed: false, tag: 'Study' },
    { id: 4, text: 'Order groceries and household supplies', completed: false, tag: 'Personal' },
  ]);
  const [newTaskText, setNewTaskText] = useState('');
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'notes'
  const [noteContent, setNoteContent] = useState(
    'Meeting notes:\n- Review API payload compression\n- Optimize frontend bundle size\n- Verify CDN edge caching rules\n- Check database index query execution plans'
  );

  // Secret Triple-Click detection on Header
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef(null);
  const [stealthPulse, setStealthPulse] = useState(false);

  const handleHeaderClick = () => {
    clickCountRef.current += 1;

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }

    if (clickCountRef.current >= 3) {
      clickCountRef.current = 0;
      setStealthPulse(true);
      setTimeout(() => {
        setStealthPulse(false);
        onUnlockSecretGate();
      }, 350);
      return;
    }

    clickTimerRef.current = setTimeout(() => {
      clickCountRef.current = 0;
    }, 1200);
  };

  const handleCornerSecretClick = (e) => {
    e.stopPropagation();
    onUnlockSecretGate();
  };

  const toggleTask = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const addTask = (e) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    setTasks([
      ...tasks,
      { id: Date.now(), text: newTaskText.trim(), completed: false, tag: 'Task' }
    ]);
    setNewTaskText('');
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between p-4 sm:p-6 transition-all duration-300">
      {/* Top Navbar */}
      <header className="w-full max-w-2xl flex items-center justify-between border-b border-slate-800 pb-4 pt-2">
        <div 
          onClick={handleHeaderClick}
          className={`cursor-pointer select-none group flex items-center gap-2.5 transition-all ${
            stealthPulse ? 'scale-105 opacity-80' : ''
          }`}
          title="Click to focus"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-sky-400 flex items-center justify-center shadow-md">
            <CheckCircle2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-100 group-hover:text-white transition-colors">
              FocusFlow <span className="text-xs font-normal text-slate-400">Personal Space</span>
            </h1>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Today's schedule & focus notes
            </p>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'tasks' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tasks ({tasks.filter(t => !t.completed).length})
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'notes' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Scratchpad
          </button>
        </div>
      </header>

      {/* Main Interactive Content */}
      <main className="w-full max-w-2xl flex-1 mt-6">
        {activeTab === 'tasks' ? (
          <div className="space-y-4">
            {/* Add Task Input */}
            <form onSubmit={addTask} className="flex gap-2">
              <input
                type="text"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                placeholder="Add a new task or checklist item..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl flex items-center gap-1 shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </form>

            {/* Task Checklist */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-sm divide-y divide-slate-800/60">
              {tasks.length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-6">All tasks completed for today. Nice work!</p>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0 group"
                  >
                    <div 
                      onClick={() => toggleTask(task.id)}
                      className="flex items-center gap-3 cursor-pointer flex-1"
                    >
                      {task.completed ? (
                        <CheckSquare className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-600 group-hover:text-slate-400 flex-shrink-0 transition-colors" />
                      )}
                      <span className={`text-sm ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                        {task.text}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                        {task.tag}
                      </span>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all p-1"
                        title="Delete task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick stats banner */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3 text-center">
                <span className="text-xs text-slate-500 block">Total</span>
                <span className="text-lg font-semibold text-slate-200">{tasks.length}</span>
              </div>
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3 text-center">
                <span className="text-xs text-slate-500 block">Pending</span>
                <span className="text-lg font-semibold text-amber-400">{tasks.filter(t => !t.completed).length}</span>
              </div>
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3 text-center">
                <span className="text-xs text-slate-500 block">Completed</span>
                <span className="text-lg font-semibold text-emerald-400">{tasks.filter(t => t.completed).length}</span>
              </div>
            </div>
          </div>
        ) : (
          /* Notes Pad */
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Fast Local Scratchpad</span>
              <span>Auto-saved locally</span>
            </div>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={12}
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono leading-relaxed"
            />
          </div>
        )}
      </main>

      {/* Discreet Footer with Hidden Corner Trigger */}
      <footer className="w-full max-w-2xl border-t border-slate-800/80 pt-4 pb-2 flex items-center justify-between text-xs text-slate-600">
        <span>© 2026 FocusFlow Utility v2.1</span>
        
        {/* Subtle, innocent-looking sync status dot which acts as a secondary discreet trigger */}
        <div 
          onClick={handleCornerSecretClick}
          className="flex items-center gap-1.5 cursor-pointer hover:text-slate-400 transition-colors py-1 px-2 rounded group"
          title="Status: Ready"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500/70 group-hover:bg-indigo-400 transition-colors animate-pulse" />
          <span className="text-[11px] font-mono">Offline-Ready</span>
        </div>
      </footer>
    </div>
  );
}

