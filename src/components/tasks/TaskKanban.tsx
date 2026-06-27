'use client';

import React, { useState } from 'react';
import { Plus, MoveRight, HelpCircle, CheckCircle } from 'lucide-react';
import { Task, TaskStatus } from '@/types';
import { TaskCard } from './TaskCard';

interface TaskKanbanProps {
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskClick: (task: Task) => void;
  onTaskEdit?: (task: Task) => void;
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
  onTaskEdit,
  onTaskComplete,
  onTaskDelete,
  onTaskRescue,
  onAddTaskClick,
}) => {
  const [draggedOverCol, setDraggedOverCol] = useState<TaskStatus | null>(null);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);

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
        justifyContent: 'center',
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
              background: isDraggedOver ? 'rgba(0, 229, 255, 0.03)' : 'transparent',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-2)',
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
                paddingRight: '12px',
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
                      onEdit={onTaskEdit || onTaskClick}
                      onCardClick={onTaskClick}
                      onDelete={onTaskDelete || (() => {})}
                      onRescue={onTaskRescue || (() => {})}
                      onHoverChange={(hovered) => setHoveredTaskId(hovered ? task.id : null)}
                      isHoveredSibling={hoveredTaskId !== null && hoveredTaskId !== task.id}
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
            </div>

            {/* Column Footer: Docked Add Task Button */}
            {col.id === 'todo' && onAddTaskClick && (
              <div style={{ padding: '8px 0 4px 0', flexShrink: 0 }}>
                <button
                  onClick={onAddTaskClick}
                  className="glass-card"
                  style={{
                    width: '100%',
                    padding: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    border: '1px dashed rgba(0, 229, 255, 0.4)',
                    background: 'rgba(0, 229, 255, 0.02)',
                    color: 'var(--neon-cyan)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: '600',
                    letterSpacing: '0.5px',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 229, 255, 0.08)';
                    e.currentTarget.style.borderStyle = 'solid';
                    e.currentTarget.style.borderColor = 'var(--neon-cyan)';
                    e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 229, 255, 0.2)';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 229, 255, 0.02)';
                    e.currentTarget.style.borderStyle = 'dashed';
                    e.currentTarget.style.borderColor = 'rgba(0, 229, 255, 0.4)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.color = 'var(--neon-cyan)';
                  }}
                >
                  <Plus size={14} />
                  <span>ADD NEW TASK</span>
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
