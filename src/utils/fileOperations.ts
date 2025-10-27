import { LPTask, TaskFromFile, TaskToFile } from '../types';
import Fraction from 'fraction.js';

export const parseTask = (taskFromFile: TaskFromFile): LPTask => {
  const { task } = taskFromFile;

  return {
    fn: task.fn.map(coeff => new Fraction(coeff)),
    constraints: task.constraints.map(row =>
      row.map(cell => new Fraction(cell))
    ),
    basis: task.basis,
    isMaximization: task.isMaximization
  };
};

export const taskToFileFormat = (task: LPTask, comment?: string): TaskToFile => {
  return {
    task: {
      fn: task.fn.map(f => f.toFraction()),
      constraints: task.constraints.map(row =>
        row.map(cell => cell.toFraction())
      ),
      basis: task.basis,
      isMaximization: task.isMaximization
    },
    comment
  };
};

export const downloadTasks = (tasks: TaskToFile[], filename: string = 'lp_tasks.json') => {
  const dataStr = JSON.stringify(tasks, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

export const uploadTasks = (): Promise<TaskFromFile[]> => {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const tasks = JSON.parse(content) as TaskFromFile[];
          resolve(tasks);
        } catch (error) {
          reject(new Error('Invalid JSON file'));
        }
      };

      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsText(file);
    };

    input.click();
  });
};

export const validateTasks = (tasks: any): tasks is TaskFromFile[] => {
  if (!Array.isArray(tasks)) return false;

  return tasks.every((task: any) => {
    if (!task || typeof task !== 'object') return false;
    if (!task.task || typeof task.task !== 'object') return false;

    const { fn, constraints, basis, isMaximization } = task.task;

    return (
      Array.isArray(fn) &&
        Array.isArray(constraints) &&
        Array.isArray(basis) &&
        typeof isMaximization === 'boolean' &&
        constraints.every((row: any) => Array.isArray(row))
    );
  });
};
