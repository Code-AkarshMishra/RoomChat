import React, { useState } from 'react';
import { 
  CheckSquare, 
  Square, 
  Plus, 
  Trash2, 
  Sun, 
  Moon,
  CheckCircle2,
  Calendar
} from 'lucide-react';

export default function CoverApp({ onUnlockSecretGate, theme, onToggleTheme }) {
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Review quarterly goals', completed: true, tag: 'Work' },
    { id: 2, text: 'Renew cloud storage subscription', completed: false, tag: 'Personal' },
    { id: 3, text: 'Clean up workspace & back up project files', completed: false, tag: 'Daily' },
    { id: 4, text: 'Grocery shopping & meal prep', completed: false, tag: 'Home' },
  ]);
  const [newTaskText, setNewTaskText] = useState('');
  const [activeTab, setActiveTab] = useState('tasks');
  const [noteContent, setNoteContent] = useState(
    'Quick Notes:\n- Call mechanic on Friday\n- Compare flight options\n- Update portfolio case studies'
  );

  const toggleTask = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const addTask = (e) => {
    e.preventDefault();
    const trimmed = newTaskText.trim();
    if (!trimmed) return;

    // 🥷 STEALTH TRIGGER: Typing "open chat" opens the hidden login gateway!
    if (trimmed.toLowerCase() === 'open chat') {
      setNewTaskText('');
      onUnlockSecretGate();
      return;
    }

    setTasks([
      ...tasks,
      { id: Date.now(), text: trimmed, completed: false, tag: 'Task' }
    ]);
    setNewTaskText('');
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} flex flex-col justify-between p-4 sm:p-6 transition-colors duration-200`}>
      {/* Top Navbar */}
      <header className={`w-full max-w-2xl mx-auto flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-200'} pb-4 pt-2`}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight">
              FocusFlow
            </h1>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Daily tasks & notes
            </p>
          </div>
        </div>

        {/* Tab switchers & Theme Toggle */}
        <div className="flex items-center gap-2">
          <div className={`flex ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-200/80 border-slate-300'} border rounded-lg p-0.5 text-xs`}>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'tasks'
                  ? (isDark ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm')
                  : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              Tasks
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'notes'
                  ? (isDark ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm')
                  : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              Notes
            </button>
          </div>

          <button
            onClick={onToggleTheme}
            className={`p-2 rounded-xl border transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800 text-amber-300 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
            title="Toggle Light / Dark Theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-2xl mx-auto flex-1 mt-6">
        {activeTab === 'tasks' ? (
          <div className="space-y-4">
            {/* Add Task Input Form */}
            <form onSubmit={addTask} className="flex gap-2">
              <input
                type="text"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                className={`flex-1 ${isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors`}
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl flex items-center gap-1 shadow-sm transition-colors active:scale-95"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </form>

            {/* Tasks List */}
            <div className={`${isDark ? 'bg-slate-900/60 border-slate-800 divide-slate-800/60' : 'bg-white border-slate-200 divide-slate-100'} border rounded-2xl p-4 shadow-xs divide-y`}>
              {tasks.length === 0 ? (
                <p className={`text-center text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'} py-6`}>
                  All tasks completed.
                </p>
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
                        <CheckSquare className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                      ) : (
                        <Square className={`w-5 h-5 ${isDark ? 'text-slate-600 group-hover:text-slate-400' : 'text-slate-300 group-hover:text-slate-500'} flex-shrink-0 transition-colors`} />
                      )}
                      <span className={`text-sm ${task.completed ? (isDark ? 'line-through text-slate-500' : 'line-through text-slate-400') : (isDark ? 'text-slate-200' : 'text-slate-800')}`}>
                        {task.text}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                        {task.tag}
                      </span>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className={`${isDark ? 'text-slate-600 hover:text-rose-400' : 'text-slate-400 hover:text-rose-500'} opacity-0 group-hover:opacity-100 transition-all p-1`}
                        title="Delete task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={12}
              className={`w-full ${isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} border rounded-2xl p-4 text-sm focus:outline-none focus:border-indigo-500 font-mono leading-relaxed`}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={`w-full max-w-2xl mx-auto border-t ${isDark ? 'border-slate-800 text-slate-600' : 'border-slate-200 text-slate-400'} pt-4 pb-2 flex items-center justify-between text-xs`}>
        <span>v2.4.0</span>
        <span className="font-mono">Ready</span>
      </footer>
    </div>
  );
}
