import { useState, useMemo, type ReactNode } from 'react';
import {
  Plus, Search, X, CheckCircle2, Circle, Clock, AlertTriangle,
  ChevronDown, Filter, ClipboardList, Trash2, Flag,
} from 'lucide-react';
import { useTransactionData } from '@/contexts/TransactionDataContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskStatus   = 'todo' | 'in_progress' | 'done';
type TaskPriority = 'high' | 'medium' | 'low';
type TaskType     = 'compliance' | 'follow_up' | 'reminder' | 'deadline' | 'other';

interface Task {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  assignee: string;
  linkedDeal: string;
  createdAt: string;
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const SEED_TASKS: Task[] = [
  { id: '1', title: 'Review earnest money receipt', type: 'compliance', priority: 'high',   status: 'todo',        dueDate: '2026-06-08', assignee: 'Sarah Chen',     linkedDeal: '123 Oak St',           description: 'Verify EMD cleared and deposited per contract terms.', createdAt: '2026-06-01' },
  { id: '2', title: 'Send commission disbursement', type: 'deadline',   priority: 'high',   status: 'in_progress', dueDate: '2026-06-09', assignee: 'Admin',          linkedDeal: '456 Maple Ave',        description: 'Process CDA and wire commissions before closing COB.', createdAt: '2026-06-02' },
  { id: '3', title: 'Follow up with lender re: appraisal', type: 'follow_up', priority: 'medium', status: 'todo', dueDate: '2026-06-10', assignee: 'Marcus Webb',   linkedDeal: '789 Pine Rd',          description: 'Appraisal was ordered 12 days ago — need status update.', createdAt: '2026-06-02' },
  { id: '4', title: 'Upload executed contract to DocuSign', type: 'compliance', priority: 'high', status: 'done', dueDate: '2026-06-05', assignee: 'Priya Nair',    linkedDeal: '321 Birch Ln',         description: 'All parties must execute within 48 hrs of offer acceptance.', createdAt: '2026-05-30' },
  { id: '5', title: 'Confirm buyer walk-through schedule', type: 'reminder', priority: 'low', status: 'todo',     dueDate: '2026-06-12', assignee: 'James Ortega',   linkedDeal: '654 Cedar Dr',         description: 'Walk-through 48 hrs before close.', createdAt: '2026-06-03' },
  { id: '6', title: 'Verify title commitment received', type: 'compliance', priority: 'medium', status: 'in_progress', dueDate: '2026-06-07', assignee: 'Dana Reyes', linkedDeal: '987 Elm St',          description: 'Title must be clear; review exceptions list.', createdAt: '2026-06-01' },
  { id: '7', title: 'Send HOA docs to buyer', type: 'follow_up', priority: 'medium', status: 'todo',               dueDate: '2026-06-11', assignee: 'Tyler Brooks',  linkedDeal: '135 Spruce Way',       description: 'HOA package must be delivered 7 days before close.', createdAt: '2026-06-03' },
  { id: '8', title: 'Prepare Q2 commission audit report', type: 'deadline', priority: 'medium', status: 'todo',   dueDate: '2026-06-30', assignee: 'Admin',          linkedDeal: '',                     description: 'Quarterly compliance review for all closed transactions.', createdAt: '2026-06-03' },
  { id: '9', title: 'Update MLS status to Pending', type: 'compliance', priority: 'low', status: 'done',          dueDate: '2026-06-04', assignee: 'Monique Laval',  linkedDeal: '246 Willow Ct',        description: 'Must update within 24 hrs of mutual acceptance.', createdAt: '2026-05-28' },
  { id: '10', title: 'Call listing agent re: repairs list', type: 'follow_up', priority: 'high', status: 'todo', dueDate: '2026-06-07', assignee: 'Kevin Park',      linkedDeal: '357 Aspen Blvd',       description: 'Inspection report revealed 6 items; need seller response.', createdAt: '2026-06-04' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_META: Record<TaskStatus, { label: string; icon: ReactNode; color: string; bg: string }> = {
  todo:        { label: 'To Do',       icon: <Circle className="w-4 h-4" />,        color: 'text-muted-foreground', bg: 'bg-secondary' },
  in_progress: { label: 'In Progress', icon: <Clock className="w-4 h-4" />,         color: 'text-blue-400',         bg: 'bg-blue-500/10' },
  done:        { label: 'Done',        icon: <CheckCircle2 className="w-4 h-4" />,  color: 'text-emerald-400',      bg: 'bg-emerald-500/10' },
};

const PRIORITY_META: Record<TaskPriority, { label: string; color: string; bg: string; dot: string }> = {
  high:   { label: 'High',   color: 'text-red-400',    bg: 'bg-red-500/15',    dot: 'bg-red-400' },
  medium: { label: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-500/15', dot: 'bg-yellow-400' },
  low:    { label: 'Low',    color: 'text-blue-400',   bg: 'bg-blue-500/15',   dot: 'bg-blue-400' },
};

const TYPE_META: Record<TaskType, string> = {
  compliance: 'Compliance',
  follow_up:  'Follow-Up',
  reminder:   'Reminder',
  deadline:   'Deadline',
  other:      'Other',
};

function isOverdue(task: Task): boolean {
  return task.status !== 'done' && task.dueDate < new Date().toISOString().slice(0, 10);
}

// ─── Task row ─────────────────────────────────────────────────────────────────

function TaskRow({ task, onToggle, onDelete }: {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const sm = STATUS_META[task.status];
  const pm = PRIORITY_META[task.priority];
  const overdue = isOverdue(task);

  return (
    <div className={`flex items-start gap-3 px-5 py-4 border-b border-border/60 hover:bg-secondary/30 transition-colors ${task.status === 'done' ? 'opacity-60' : ''}`}>
      {/* Status toggle */}
      <button
        onClick={() => onToggle(task.id)}
        className={`mt-0.5 shrink-0 ${sm.color} hover:scale-110 transition-transform`}
        title="Toggle status"
      >
        {sm.icon}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className={`font-medium text-sm ${task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
            {task.title}
          </span>
          {overdue && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-red-500/15 text-red-400 rounded-full text-[10px] font-semibold">
              <AlertTriangle className="w-2.5 h-2.5" /> Overdue
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{task.assignee}</span>
          {task.linkedDeal && <span>· {task.linkedDeal}</span>}
          <span>· Due {task.dueDate}</span>
        </div>
        {task.description && (
          <p className="text-muted-foreground text-xs mt-1.5 line-clamp-2">{task.description}</p>
        )}
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${pm.bg} ${pm.color}`}>
          {pm.label}
        </span>
        <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-secondary text-muted-foreground">
          {TYPE_META[task.type]}
        </span>
        <button onClick={() => onDelete(task.id)} className="p-1 rounded text-muted-foreground hover:text-red-400 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── New task form ────────────────────────────────────────────────────────────

function NewTaskForm({
  agentNames, onAdd, onClose,
}: {
  agentNames: string[];
  onAdd: (t: Task) => void;
  onClose: () => void;
}) {
  const [title, setTitle]     = useState('');
  const [type, setType]       = useState<TaskType>('other');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [assignee, setAssignee] = useState('Admin');
  const [linkedDeal, setLinkedDeal] = useState('');
  const [description, setDescription] = useState('');

  const fieldCls = 'w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500';

  const submit = () => {
    if (!title.trim()) return;
    onAdd({
      id: `task-${Date.now()}`,
      title: title.trim(),
      type, priority,
      status: 'todo',
      dueDate, assignee,
      linkedDeal, description,
      createdAt: new Date().toISOString().slice(0, 10),
    });
    onClose();
  };

  return (
    <div className="bg-background border border-border rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-foreground font-semibold text-sm">New Task</p>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
      </div>
      <input className={fieldCls} placeholder="Task title *" value={title} onChange={e => setTitle(e.target.value)} />
      <textarea className={`${fieldCls} h-16 resize-none`} placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <select value={type} onChange={e => setType(e.target.value as TaskType)} className={fieldCls}>
          {(Object.keys(TYPE_META) as TaskType[]).map(t => <option key={t} value={t}>{TYPE_META[t]}</option>)}
        </select>
        <select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)} className={fieldCls}>
          <option value="high">High Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="low">Low Priority</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={fieldCls} />
        <select value={assignee} onChange={e => setAssignee(e.target.value)} className={fieldCls}>
          <option value="Admin">Admin</option>
          {agentNames.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      <input className={fieldCls} placeholder="Linked deal / address (optional)" value={linkedDeal} onChange={e => setLinkedDeal(e.target.value)} />
      <button onClick={submit} className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium">
        Create Task
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const { agentMetrics } = useTransactionData();
  const [tasks, setTasks]       = useState<Task[]>(SEED_TASKS);
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter]   = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [typeFilter, setTypeFilter]       = useState<TaskType | 'all'>('all');
  const [showNew, setShowNew]   = useState(false);

  const agentNames = useMemo(() => agentMetrics.map(a => a.agentName).slice(0, 30), [agentMetrics]);

  const toggleStatus = (id: string) =>
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const next: TaskStatus = t.status === 'todo' ? 'in_progress' : t.status === 'in_progress' ? 'done' : 'todo';
      return { ...t, status: next };
    }));

  const deleteTask = (id: string) => setTasks(prev => prev.filter(t => t.id !== id));

  const filtered = useMemo(() => {
    let list = tasks;
    if (statusFilter !== 'all')   list = list.filter(t => t.status === statusFilter);
    if (priorityFilter !== 'all') list = list.filter(t => t.priority === priorityFilter);
    if (typeFilter !== 'all')     list = list.filter(t => t.type === typeFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.assignee.toLowerCase().includes(q) ||
        t.linkedDeal.toLowerCase().includes(q)
      );
    }
    // Sort: overdue first, then by priority (high→low), then by dueDate
    return [...list].sort((a, b) => {
      const aOD = isOverdue(a) ? 0 : 1, bOD = isOverdue(b) ? 0 : 1;
      if (aOD !== bOD) return aOD - bOD;
      const pOrder: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };
      if (a.priority !== b.priority) return pOrder[a.priority] - pOrder[b.priority];
      return a.dueDate.localeCompare(b.dueDate);
    });
  }, [tasks, statusFilter, priorityFilter, typeFilter, search]);

  // Counts
  const totalOverdue   = tasks.filter(isOverdue).length;
  const totalTodo      = tasks.filter(t => t.status === 'todo').length;
  const totalInProgress = tasks.filter(t => t.status === 'in_progress').length;
  const totalDone      = tasks.filter(t => t.status === 'done').length;
  const todayStr       = new Date().toISOString().slice(0, 10);
  const dueToday       = tasks.filter(t => t.dueDate === todayStr && t.status !== 'done').length;

  return (
    <div className="space-y-6 pb-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Compliance deadlines, follow-ups, and action items.</p>
        </div>
        <button
          onClick={() => setShowNew(v => !v)}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      {/* New task form */}
      {showNew && <NewTaskForm agentNames={agentNames} onAdd={t => setTasks(prev => [t, ...prev])} onClose={() => setShowNew(false)} />}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Overdue',     value: totalOverdue,    color: 'text-red-400',    bg: 'bg-red-500/10',    icon: <AlertTriangle className="w-4 h-4 text-red-400" /> },
          { label: 'Due Today',   value: dueToday,        color: 'text-orange-400', bg: 'bg-orange-500/10', icon: <Clock className="w-4 h-4 text-orange-400" /> },
          { label: 'To Do',       value: totalTodo,       color: 'text-muted-foreground', bg: 'bg-secondary', icon: <Circle className="w-4 h-4 text-muted-foreground" /> },
          { label: 'In Progress', value: totalInProgress, color: 'text-blue-400',   bg: 'bg-blue-500/10',   icon: <Clock className="w-4 h-4 text-blue-400" /> },
          { label: 'Done',        value: totalDone,       color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" /> },
        ].map(k => (
          <div key={k.label} className={`${k.bg} border border-border rounded-xl p-3 flex items-center gap-3`}>
            {k.icon}
            <div>
              <p className="text-muted-foreground text-xs">{k.label}</p>
              <p className={`text-xl font-bold tabular-nums ${k.color}`}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + search */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status chips */}
        {(['all', 'todo', 'in_progress', 'done'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              statusFilter === s
                ? 'bg-secondary text-foreground border-transparent'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {s === 'all' ? 'All' : STATUS_META[s].label}
          </button>
        ))}

        <div className="w-px h-4 bg-border mx-1" />

        {/* Priority filter */}
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value as TaskPriority | 'all')}
          className="bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none"
        >
          <option value="all">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as TaskType | 'all')}
          className="bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none"
        >
          <option value="all">All Types</option>
          {(Object.keys(TYPE_META) as TaskType[]).map(t => <option key={t} value={t}>{TYPE_META[t]}</option>)}
        </select>

        <div className="flex-1" />

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="bg-secondary border border-border rounded-lg pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500 w-44"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Task list */}
      <div className="bg-background border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-secondary/40">
          <span className="text-muted-foreground text-xs font-medium">{filtered.length} task{filtered.length !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-1.5">
            <Flag className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground text-xs">Sorted: overdue → priority → due date</span>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <ClipboardList className="w-8 h-8 opacity-40" />
            <p className="text-sm">{tasks.length === 0 ? 'No tasks yet — create your first task.' : 'No tasks match the current filters.'}</p>
          </div>
        ) : (
          filtered.map(task => (
            <TaskRow key={task.id} task={task} onToggle={toggleStatus} onDelete={deleteTask} />
          ))
        )}
      </div>
    </div>
  );
}
