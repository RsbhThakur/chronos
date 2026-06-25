'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Edit2, Trash2, Zap, Sparkles, AlertTriangle } from 'lucide-react';
import { Task } from '@/types';

interface TaskCardProps {
  task: Task;
  onComplete: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onRescue: (taskId: string) => void;
  compact?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onComplete,
  onEdit,
  onDelete,
  onRescue,
  compact = false,
}) => {
  const [timeLeftStr, setTimeLeftStr] = useState('');
  const [urgency, setUrgency] = useState<'normal' | 'amber' | 'red' | 'overdue'>('normal');
  const [isCompleting, setIsCompleting] = useState(false);

  // Real-time Countdown timer ticking every minute
  useEffect(() => {
    const calculateTimeLeft = () => {
      if (task.status === 'completed') {
        setTimeLeftStr('Completed');
        setUrgency('normal');
        return;
      }

      const deadline = new Date(task.deadline);
      const now = new Date();
      const diffMs = deadline.getTime() - now.getTime();

      if (diffMs < 0) {
        setTimeLeftStr('OVERDUE');
        setUrgency('overdue');
        return;
      }

      const diffHrs = diffMs / (1000 * 60 * 60);

      if (diffHrs >= 24) {
        // More than 24 hours: show static formatted date e.g., "Jun 28"
        setTimeLeftStr(
          deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        );
        setUrgency('normal');
      } else {
        // Less than 24 hours: calculate countdown
        const totalMinutes = Math.floor(diffMs / 60000);
        const hrs = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        setTimeLeftStr(`${hrs}h ${mins}m left`);

        if (diffHrs < 2) {
          // Less than 2 hours: Red countdown
          setUrgency('red');
        } else {
          // Less than 24 hours but more than 2 hours: Amber countdown
          setUrgency('amber');
        }
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000); // Ticks every minute

    return () => clearInterval(interval);
  }, [task.deadline, task.status]);

  // Priority color config for left border
  const priorityColors = {
    critical: 'var(--neon-red)',
    high: 'var(--neon-pink)',
    medium: 'var(--neon-amber)',
    low: 'var(--neon-green)',
  };

  // Subtask calculations
  const subtasks = task.subtasks || [];
  const totalSubtasks = subtasks.length;
  const completedSubtasks = subtasks.filter((st) => st.completed).length;
  const progressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  const handleCompleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCompleting(true);
    // Give animation time to play before calling callback
    setTimeout(() => {
      onComplete(task.id);
    }, 400);
  };

  return (
    <AnimatePresence>
      {!isCompleting && (
        <motion.div
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.3 } }}
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className={`glass-card relative flex flex-col justify-between w-full ${
            task.rescuePlan ? 'animate-rescue' : ''
          }`}
          style={{
            borderLeft: `4px solid ${priorityColors[task.priority] || 'var(--glass-border)'}`,
            padding: compact ? 'var(--space-3)' : 'var(--space-4)',
            minHeight: compact ? 'auto' : '150px',
            cursor: 'pointer',
          }}
          onClick={() => onEdit(task)}
        >
          {/* Top Row: Title + Priority Badge */}
          <div className="flex justify-between items-start w-full gap-3">
            <div className="flex flex-col">
              <h4
                className={`font-semibold tracking-wide truncate ${
                  task.status === 'completed' ? 'line-through text-secondary' : ''
                }`}
                style={{
                  fontSize: 'var(--text-base)',
                  color: task.status === 'completed' ? 'var(--text-tertiary)' : 'var(--text-primary)',
                  maxWidth: compact ? '150px' : '220px',
                }}
              >
                {task.title}
              </h4>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                {task.category}
              </span>
            </div>

            <div className="flex gap-1 items-center">
              {task.aiGenerated && (
                <span className="badge badge--cyan flex items-center gap-1">
                  <Sparkles size={10} /> AI
                </span>
              )}
              <span
                className={`badge ${
                  task.priority === 'critical'
                    ? 'badge--pink'
                    : task.priority === 'high'
                    ? 'badge--pink'
                    : task.priority === 'medium'
                    ? 'badge--amber'
                    : 'badge--green'
                }`}
              >
                {task.priority}
              </span>
            </div>
          </div>

          {/* Middle Section: Description (truncated to 2 lines) */}
          {!compact && task.description && (
            <p
              className="w-full text-secondary"
              style={{
                fontSize: 'var(--text-sm)',
                margin: 'var(--space-2) 0',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                color: 'var(--text-secondary)',
              }}
            >
              {task.description}
            </p>
          )}

          {/* Subtasks Progress Bar */}
          {totalSubtasks > 0 && !compact && (
            <div className="flex flex-col w-full gap-1" style={{ margin: 'var(--space-2) 0' }}>
              <div className="flex justify-between items-center w-full" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                <span>{`${completedSubtasks}/${totalSubtasks} subtasks`}</span>
                <span>{`${progressPercent}%`}</span>
              </div>
              <div
                className="w-full"
                style={{
                  height: '4px',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-full)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${progressPercent}%`,
                    background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-purple))',
                    borderRadius: 'var(--radius-full)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          )}

          {/* Bottom Row: Badges, Timer, and Actions */}
          <div className="flex justify-between items-center w-full" style={{ marginTop: 'var(--space-2)' }}>
            {/* Status Badges or Time Left */}
            <div className="flex gap-2 items-center">
              {urgency === 'overdue' && (
                <span className="badge badge--pink animate-pulse-neon">OVERDUE</span>
              )}
              {urgency === 'red' && (
                <span
                  className="animate-pulse-neon font-bold flex items-center gap-1"
                  style={{ color: 'var(--neon-red)', fontSize: 'var(--text-xs)' }}
                >
                  <AlertTriangle size={12} /> {timeLeftStr}
                </span>
              )}
              {urgency === 'amber' && (
                <span
                  className="font-semibold"
                  style={{ color: 'var(--neon-amber)', fontSize: 'var(--text-xs)' }}
                >
                  {timeLeftStr}
                </span>
              )}
              {urgency === 'normal' && task.status !== 'completed' && (
                <span
                  style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}
                >
                  {timeLeftStr}
                </span>
              )}
              {task.status === 'completed' && (
                <span
                  style={{ color: 'var(--neon-green)', fontSize: 'var(--text-xs)', fontWeight: 'bold' }}
                >
                  ✓ Completed
                </span>
              )}

              {/* Specialized Agent Output Badges */}
              {task.rescuePlan && task.status !== 'completed' && (
                <span className="badge badge--pink animate-pulse-neon" style={{ border: '1px solid var(--neon-pink)' }}>
                  🚨 Rescue Active
                </span>
              )}
              {task.ghostWorkerOutput && (
                <span className="badge badge--purple">
                  👻 Draft Ready
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
              {task.status !== 'completed' && (
                <button
                  onClick={handleCompleteClick}
                  className="flex items-center justify-center"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '2px',
                    transition: 'color var(--transition-fast)',
                  }}
                  title="Complete Task"
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--neon-green)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                >
                  <Check size={16} />
                </button>
              )}
              
              {task.status !== 'completed' && !task.rescuePlan && (
                <button
                  onClick={() => onRescue(task.id)}
                  className="flex items-center justify-center"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '2px',
                    transition: 'color var(--transition-fast)',
                  }}
                  title="Activate Rescue Mode"
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--neon-pink)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                >
                  <Zap size={15} />
                </button>
              )}

              <button
                onClick={() => onEdit(task)}
                className="flex items-center justify-center"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '2px',
                  transition: 'color var(--transition-fast)',
                }}
                title="Edit Task"
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--neon-cyan)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
              >
                <Edit2 size={14} />
              </button>

              <button
                onClick={() => onDelete(task.id)}
                className="flex items-center justify-center"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '2px',
                  transition: 'color var(--transition-fast)',
                }}
                title="Delete Task"
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--neon-red)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
