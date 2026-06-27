'use client';

import React, { useState } from 'react';
import { Plus, MoveRight, HelpCircle, CheckCircle } from 'lucide-react';
import { Task, TaskStatus } from '@/types';
import { TaskCard } from './TaskCard';

interface TaskKanbanProps {
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskClick: (task: Task) => void;
  onTaskComplete?: (taskId: string) => void;
  onTaskDelete?: (taskId: string) => void;
  onTaskRescue?: (taskId: string) => void;
  onAddTaskClick?: () => void;
}

interface ColumnConfig {
  id: TaskStatus;
  title: string;
  badgeClass: string;
}

export const TaskKanban: React.FC<TaskKanbanProps> = ({
  tasks,
  onTaskUpdate,
  onTaskClick,
  onTaskComplete,
  onTaskDelete,
  onTaskRescue,
  onAddTaskClick,
}) => {
  const [draggedOverCol, setDraggedOverCol] = useState<TaskStatus | null>(null);

  // Column definitions
  const columns: ColumnConfig[] = [
    { id: 'todo', title: 'Todo', badgeClass: 'badge--cyan' },
    { id: 'in_progress', title: 'In Progress', badgeClass: 'badge--amber' },
    { id: 'completed', title: 'Completed', badgeClass: 'badge--green' },
  ];

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, columnId: TaskStatus) => {
    e.preventDefault(); // Required to allow dropping!
    setDraggedOverCol(columnId);
  };

  const handleDragLeave = () => {
    setDraggedOverCol(null);
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: TaskStatus) => {
    e.preventDefault();
    setDraggedOverCol(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    // Call update callback with new status
    onTaskUpdate(taskId, { status: targetColumnId });
  };

  // Helper to filter tasks by column status
  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter((t) => t.status === status);
  };

  return (
    <div
      className="flex w-full gap-6"
      style={{
        height: '100%',
        overflowX: 'auto',
        paddingBottom: 'var(--space-4)',
        alignItems: 'stretch',
      }}
    >
      {columns.map((col) => {
        const colTasks = getTasksByStatus(col.id);
        const isDraggedOver = draggedOverCol === col.id;

        return (
          <div
            key={col.id}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.id)}
            className="flex-col w-full"
            style={{
              flex: '1 0 320px',
              maxWidth: '450px',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4)',
              border: isDraggedOver ? '2px dashed var(--neon-cyan)' : '2px solid transparent',
              boxShadow: isDraggedOver ? '0 0 15px var(--neon-cyan-glow)' : 'none',
              transition: 'all var(--transition-base)',
              boxSizing: 'border-box'
            }}
          >
            {/* Column Header */}
            <div
              className="flex justify-between items-center w-full"
              style={{
                marginBottom: 'var(--space-4)',
                borderBottom: '1px solid var(--glass-border)',
                paddingBottom: 'var(--space-2)',
                flexShrink: 0
              }}
            >
              <h3 className="font-display font-semibold tracking-wide" style={{ fontSize: 'var(--text-md)' }}>
                {col.title}
              </h3>
              <span className={`badge ${col.badgeClass}`} style={{ fontSize: 'var(--text-xs)' }}>
                {colTasks.length}
              </span>
            </div>

            {/* Column Body: Task cards list */}
            <div
              className="flex-col gap-3 w-full"
              style={{
                flex: 1,
                display: 'flex',
                overflowY: 'auto',
                paddingBottom: 'var(--space-4)',
                minHeight: 0
              }}
            >
              {colTasks.length > 0 ? (
                colTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                  >
                    <TaskCard
                      task={task}
                      onComplete={onTaskComplete || (() => onTaskUpdate(task.id, { status: 'completed' }))}
                      onEdit={onTaskClick}
                      onDelete={onTaskDelete || (() => {})}
                      onRescue={onTaskRescue || (() => {})}
                    />
                  </div>
                ))
              ) : (
                /* Empty Column State */
                <div
                  className="flex-col items-center justify-center w-full"
                  style={{
                    display: 'flex',
                    flex: '1',
                    color: 'var(--text-tertiary)',
                    fontSize: 'var(--text-sm)',
                    border: '1px dashed var(--glass-border)',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.01)',
                    padding: 'var(--space-4)',
                    textAlign: 'center',
                  }}
                >
                  {col.id === 'todo' && <HelpCircle size={40} style={{ opacity: 0.3, marginBottom: 'var(--space-2)' }} />}
                  {col.id === 'in_progress' && <MoveRight size={40} style={{ opacity: 0.3, marginBottom: 'var(--space-2)' }} />}
                  {col.id === 'completed' && <CheckCircle size={40} style={{ opacity: 0.3, marginBottom: 'var(--space-2)' }} />}
                  <span>{`No ${col.title.toLowerCase()} tasks`}</span>
                </div>
              )}

              {/* Add Task Button at bottom of Todo column */}
              {col.id === 'todo' && onAddTaskClick && (
                <button
                  onClick={onAddTaskClick}
                  className="glow-button w-full"
                  style={{
                    marginTop: 'auto',
                    borderStyle: 'dashed',
                    background: 'transparent',
                  }}
                >
                  <Plus size={16} /> Add Task
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
