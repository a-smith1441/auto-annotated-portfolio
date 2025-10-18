import { FormEvent, useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';

import Section from '../Section';

const STORAGE_KEY = 'task-management-section-data';

type TaskStatus = 'todo' | 'inProgress' | 'done';

type Task = {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    createdAt: string;
    dueDate?: string;
};

type HistoryEntry = {
    id: string;
    taskId: string;
    action: 'created' | 'deleted' | 'status';
    timestamp: string;
    details: string;
    status?: TaskStatus;
};

type TaskManagementSectionProps = {
    type?: string;
    elementId?: string;
    colors?: 'colors-a' | 'colors-b' | 'colors-c' | 'colors-d' | 'colors-e' | 'colors-f';
    backgroundSize?: 'full' | 'inset';
    styles?: any;
    title?: string;
    description?: string;
};

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
    { value: 'todo', label: 'To Do' },
    { value: 'inProgress', label: 'In Progress' },
    { value: 'done', label: 'Done' }
];

const formatDateTime = (value?: string) => {
    if (!value) {
        return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const buildId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default function TaskManagementSection(props: TaskManagementSectionProps) {
    const { type, elementId, colors, backgroundSize, styles = {}, title, description } = props;

    const [tasks, setTasks] = useState<Task[]>([]);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [formValues, setFormValues] = useState({ title: '', description: '', dueDate: '' });
    const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
    const [error, setError] = useState<string | null>(null);
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        try {
            const stored = window.localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                setTasks(Array.isArray(parsed.tasks) ? parsed.tasks : []);
                setHistory(Array.isArray(parsed.history) ? parsed.history : []);
            }
        } catch (err) {
            console.error('Failed to load tasks from storage', err);
        } finally {
            setIsHydrated(true);
        }
    }, []);

    useEffect(() => {
        if (!isHydrated || typeof window === 'undefined') {
            return;
        }
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks, history }));
    }, [tasks, history, isHydrated]);

    const addHistoryEntry = (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
        const timestamp = new Date().toISOString();
        const fullEntry: HistoryEntry = { ...entry, id: buildId(), timestamp };
        setHistory((prev) => [fullEntry, ...prev]);
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        const trimmedTitle = formValues.title.trim();
        const trimmedDescription = formValues.description.trim();
        if (!trimmedTitle) {
            setError('Please provide a task title before adding a new task.');
            return;
        }

        const createdAt = new Date().toISOString();
        const newTask: Task = {
            id: buildId(),
            title: trimmedTitle,
            description: trimmedDescription,
            status: 'todo',
            createdAt,
            dueDate: formValues.dueDate ? new Date(formValues.dueDate).toISOString() : undefined
        };

        setTasks((prev) => [newTask, ...prev]);
        addHistoryEntry({
            taskId: newTask.id,
            action: 'created',
            details: `Task "${newTask.title}" created`,
            status: newTask.status
        });
        setFormValues({ title: '', description: '', dueDate: '' });
    };

    const handleDelete = (task: Task) => {
        setTasks((prev) => prev.filter((item) => item.id !== task.id));
        addHistoryEntry({
            taskId: task.id,
            action: 'deleted',
            details: `Task "${task.title}" deleted`
        });
    };

    const handleStatusChange = (task: Task, status: TaskStatus) => {
        setTasks((prev) =>
            prev.map((item) => (item.id === task.id ? { ...item, status } : item))
        );
        addHistoryEntry({
            taskId: task.id,
            action: 'status',
            details: `Status changed to ${STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status}`,
            status
        });
    };

    const filteredTasks = useMemo(() => {
        if (statusFilter === 'all') {
            return tasks;
        }
        return tasks.filter((task) => task.status === statusFilter);
    }, [tasks, statusFilter]);

    const statusSummary = useMemo(() => {
        return tasks.reduce(
            (acc, task) => {
                acc[task.status] += 1;
                acc.total += 1;
                return acc;
            },
            { total: 0, todo: 0, inProgress: 0, done: 0 } as Record<'total' | TaskStatus, number>
        );
    }, [tasks]);

    return (
        <Section type={type} elementId={elementId} colors={colors} backgroundSize={backgroundSize} styles={styles.self}>
            <div className="flex flex-col gap-8">
                <header className="flex flex-col gap-4">
                    {title && <h2 className="text-3xl font-semibold text-primary">{title}</h2>}
                    {description && <p className="max-w-3xl text-lg text-neutral-600">{description}</p>}
                    <div className="flex flex-wrap gap-4 text-sm">
                        <SummaryBadge label="Total" value={statusSummary.total} />
                        <SummaryBadge label="To Do" value={statusSummary.todo} />
                        <SummaryBadge label="In Progress" value={statusSummary.inProgress} />
                        <SummaryBadge label="Done" value={statusSummary.done} />
                    </div>
                </header>

                <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
                    <div>
                        <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                            <h3 className="text-xl font-semibold text-slate-900">Add a Task</h3>
                            <p className="mt-1 text-sm text-slate-500">
                                Capture tasks with details, schedule due dates, and monitor progress.
                            </p>
                            <div className="mt-4 flex flex-col gap-4">
                                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                                    Task title
                                    <input
                                        type="text"
                                        value={formValues.title}
                                        onChange={(event) => setFormValues((prev) => ({ ...prev, title: event.target.value }))}
                                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        placeholder="e.g. Prepare sprint review deck"
                                    />
                                </label>
                                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                                    Description
                                    <textarea
                                        value={formValues.description}
                                        onChange={(event) => setFormValues((prev) => ({ ...prev, description: event.target.value }))}
                                        className="min-h-[96px] w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        placeholder="Outline the steps, links, or notes for the task"
                                    />
                                </label>
                                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                                    Due date &amp; time
                                    <input
                                        type="datetime-local"
                                        value={formValues.dueDate}
                                        onChange={(event) => setFormValues((prev) => ({ ...prev, dueDate: event.target.value }))}
                                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </label>
                            </div>
                            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
                            <div className="mt-6 flex justify-end">
                                <button
                                    type="submit"
                                    className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
                                >
                                    Add Task
                                </button>
                            </div>
                        </form>
                        <div className="mt-8 flex flex-wrap gap-3">
                            {(['all', ...STATUS_OPTIONS.map((option) => option.value)] as const).map((filter) => {
                                const isActive = statusFilter === filter;
                                const label =
                                    filter === 'all'
                                        ? 'All'
                                        : STATUS_OPTIONS.find((option) => option.value === filter)?.label ?? filter;
                                return (
                                    <button
                                        key={filter}
                                        onClick={() => setStatusFilter(filter)}
                                        className={classNames(
                                            'rounded-full border px-4 py-1 text-sm transition',
                                            isActive
                                                ? 'border-primary bg-primary text-white shadow'
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-primary/60 hover:text-primary'
                                        )}
                                        type="button"
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="mt-6 space-y-4">
                            {isHydrated ? (
                                filteredTasks.length > 0 ? (
                                    filteredTasks.map((task) => (
                                        <article key={task.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                                            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                                <div>
                                                    <h4 className="text-lg font-semibold text-slate-900">{task.title}</h4>
                                                    {task.description && (
                                                        <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{task.description}</p>
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-2 md:items-end">
                                                    <label className="text-sm font-medium text-slate-700">
                                                        Status
                                                        <select
                                                            value={task.status}
                                                            onChange={(event) =>
                                                                handleStatusChange(task, event.target.value as TaskStatus)
                                                            }
                                                            className="mt-1 w-40 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                        >
                                                            {STATUS_OPTIONS.map((option) => (
                                                                <option key={option.value} value={option.value}>
                                                                    {option.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(task)}
                                                        className="text-sm font-medium text-red-600 hover:text-red-500"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                            <dl className="mt-4 grid gap-3 text-xs text-slate-500 sm:grid-cols-2">
                                                <div>
                                                    <dt className="font-semibold uppercase tracking-wide text-slate-400">Created</dt>
                                                    <dd>{formatDateTime(task.createdAt)}</dd>
                                                </div>
                                                {task.dueDate && (
                                                    <div>
                                                        <dt className="font-semibold uppercase tracking-wide text-slate-400">Due</dt>
                                                        <dd>{formatDateTime(task.dueDate)}</dd>
                                                    </div>
                                                )}
                                            </dl>
                                        </article>
                                    ))
                                ) : (
                                    <p className="rounded-md border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                                        No tasks match this filter yet. Add one above to get started.
                                    </p>
                                )
                            ) : (
                                <p className="rounded-md border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                                    Loading tasks...
                                </p>
                            )}
                        </div>
                    </div>
                    <aside className="rounded-lg border border-slate-200 bg-slate-50 p-6">
                        <h3 className="text-lg font-semibold text-slate-900">Task History</h3>
                        <p className="mt-1 text-sm text-slate-600">
                            Track how tasks evolve over time, including creation, updates, and deletions.
                        </p>
                        <div className="mt-4 space-y-4 overflow-y-auto">
                            {isHydrated ? (
                                history.length > 0 ? (
                                    history.map((entry) => (
                                        <div key={entry.id} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                                            <p className="text-sm font-medium text-slate-800">{entry.details}</p>
                                            <p className="mt-1 text-xs text-slate-500">{formatDateTime(entry.timestamp)}</p>
                                            {entry.status && (
                                                <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                                                    {STATUS_OPTIONS.find((option) => option.value === entry.status)?.label ?? entry.status}
                                                </span>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="rounded-md border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
                                        History will appear here as you manage tasks.
                                    </p>
                                )
                            ) : (
                                <p className="rounded-md border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
                                    Loading history...
                                </p>
                            )}
                        </div>
                    </aside>
                </div>
            </div>
        </Section>
    );
}

type SummaryBadgeProps = {
    label: string;
    value: number;
};

function SummaryBadge({ label, value }: SummaryBadgeProps) {
    return (
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <span>{label}</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{value}</span>
        </span>
    );
}
