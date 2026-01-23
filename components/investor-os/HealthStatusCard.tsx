'use client';

import React from 'react';
import { Activity, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface MetricData {
  date: Date;
  value: number;
  unit: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: Date | null;
}

interface Investment {
  id: string;
  status: string;
}

interface HealthStatusCardProps {
  metricsByType: Record<string, MetricData[]>;
  tasks: Task[];
  investments: Investment[];
}

type HealthStatus = 'green' | 'yellow' | 'red';

export function HealthStatusCard({ metricsByType, tasks, investments }: HealthStatusCardProps) {
  // Calculate health status based on runway and other factors
  const calculateHealth = (): { status: HealthStatus; reason: string; runway: number | null } => {
    // Check for written off investments
    const hasWrittenOff = investments.some(inv => inv.status === 'WRITTEN_OFF');
    if (hasWrittenOff) {
      return { status: 'red', reason: 'Investment written off', runway: null };
    }

    // Get runway from metrics
    const runwayMetrics = metricsByType['RUNWAY'] || metricsByType['runway'];
    const runway = runwayMetrics?.[0]?.value || null;

    // Check for overdue critical tasks
    const now = new Date();
    const overdueCriticalTasks = tasks.filter(task => {
      if (!task.dueDate) return false;
      const isOverdue = new Date(task.dueDate) < now;
      const isCritical = task.priority === 'URGENT' || task.priority === 'HIGH';
      const isOpen = task.status === 'TODO' || task.status === 'IN_PROGRESS';
      return isOverdue && isCritical && isOpen;
    });

    // Determine health based on runway
    if (runway !== null) {
      if (runway < 6) {
        return { status: 'red', reason: `${runway} months runway`, runway };
      } else if (runway < 12) {
        return { status: 'yellow', reason: `${runway} months runway`, runway };
      } else {
        // Check for overdue tasks even with good runway
        if (overdueCriticalTasks.length > 0) {
          return {
            status: 'yellow',
            reason: `${overdueCriticalTasks.length} overdue critical task${overdueCriticalTasks.length !== 1 ? 's' : ''}`,
            runway
          };
        }
        return { status: 'green', reason: 'On track', runway };
      }
    }

    // No runway data - check tasks
    if (overdueCriticalTasks.length > 0) {
      return {
        status: 'yellow',
        reason: `${overdueCriticalTasks.length} overdue task${overdueCriticalTasks.length !== 1 ? 's' : ''}`,
        runway: null
      };
    }

    // No data to determine health
    return { status: 'green', reason: 'No issues detected', runway: null };
  };

  const { status, reason, runway } = calculateHealth();

  const statusConfig = {
    green: {
      bgColor: 'bg-green-50',
      dotColor: 'bg-green-500',
      textColor: 'text-green-700',
      icon: CheckCircle,
      label: 'Healthy'
    },
    yellow: {
      bgColor: 'bg-yellow-50',
      dotColor: 'bg-yellow-500',
      textColor: 'text-yellow-700',
      icon: AlertTriangle,
      label: 'Needs Attention'
    },
    red: {
      bgColor: 'bg-red-50',
      dotColor: 'bg-red-500',
      textColor: 'text-red-700',
      icon: XCircle,
      label: 'Critical'
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={`rounded-lg p-4 ${config.bgColor}`}>
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
        <Activity className="w-4 h-4" />
        Health Status
      </div>
      <div className="flex items-center gap-3">
        <div className={`w-4 h-4 rounded-full ${config.dotColor} animate-pulse`}></div>
        <div>
          <div className={`font-semibold ${config.textColor} flex items-center gap-1`}>
            <Icon className="w-4 h-4" />
            {config.label}
          </div>
          <div className="text-sm text-gray-600">{reason}</div>
          {runway !== null && (
            <div className="text-xs text-gray-500 mt-1">
              Runway: {runway} months
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
