import React, { useState } from 'react';
import { LPTask, TaskFromFile, TaskToFile } from '../types';
import { downloadTasks, uploadTasks, validateTasks, taskToFileFormat } from '../utils/fileOperations';
import Fraction from 'fraction.js';

interface FileOperationsProps {
  currentTask: LPTask | null;
  onTasksLoaded: (tasks: TaskFromFile[]) => void;
  onTaskSelected: (task: LPTask) => void;
}

export const FileOperations: React.FC<FileOperationsProps> = ({
  currentTask,
  onTasksLoaded,
  onTaskSelected
}) => {
  const [loadedTasks, setLoadedTasks] = useState<TaskFromFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpload = async () => {
    setIsLoading(true);
    try {
      const tasks = await uploadTasks();
      if (!validateTasks(tasks)) {
        alert('Invalid file format. Please check the file structure.');
        return;
      }
      setLoadedTasks(tasks);
      onTasksLoaded(tasks);
    } catch (error) {
      alert(`Error loading file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!currentTask) {
      alert('No current task to save');
      return;
    }

    const taskToSave = taskToFileFormat(currentTask, 'Saved task');
    downloadTasks([taskToSave], 'lp_task.json');
  };

  const handleDownloadAll = () => {
    if (loadedTasks.length === 0) {
      alert('No loaded tasks to save');
      return;
    }

    downloadTasks(loadedTasks as unknown as TaskToFile[], 'lp_tasks_collection.json');
  };

  const handleTaskSelect = (taskIndex: number) => {
    const selectedTask = loadedTasks[taskIndex];
    const lpTask: LPTask = {
      fn: selectedTask.task.fn.map(coeff => new Fraction(coeff)),
      constraints: selectedTask.task.constraints.map(row =>
        row.map(cell => new Fraction(cell))
      ),
      basis: selectedTask.task.basis,
      isMaximization: selectedTask.task.isMaximization
    };
    onTaskSelected(lpTask);
  };

  return (
    <div className="file-operations">
      <h3>File Operations</h3>

      <div className="file-buttons">
        <button
          onClick={handleUpload}
          disabled={isLoading}
          className="file-button"
        >
          {isLoading ? 'Loading...' : 'Upload Tasks'}
        </button>

        <button
          onClick={handleDownload}
          disabled={!currentTask}
          className="file-button"
        >
          Save Current Task
        </button>

        <button
          onClick={handleDownloadAll}
          disabled={loadedTasks.length === 0}
          className="file-button"
        >
          Save All Tasks
        </button>
      </div>

      {loadedTasks.length > 0 && (
        <div className="loaded-tasks">
          <h4>Loaded Tasks ({loadedTasks.length})</h4>
          <div className="task-list">
            {loadedTasks.map((task, index) => (
              <div key={index} className="task-item">
                <div className="task-info">
                  <div className="task-size">
                    {task.task.constraints.length} × {task.task.fn.length}
                  </div>
                  <div className="task-type">
                    {task.task.isMaximization ? 'Maximize' : 'Minimize'}
                  </div>
                  {task.comment && (
                    <div className="task-comment">📝 {task.comment}</div>
                  )}
                </div>
                <button
                  onClick={() => handleTaskSelect(index)}
                  className="select-task-button"
                >
                  Select
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
