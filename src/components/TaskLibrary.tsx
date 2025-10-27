import React, { useState } from 'react';
import { LPTask, TaskFromFile } from '../types';
import { parseTask } from '../utils/fileOperations';

const predefinedTasks: TaskFromFile[] = [
  {
    task: {
      fn: [-2, -1, -3, -1, 0],
      constraints: [
        [1, 2, 5, -1, 4],
        [1, -1, -1, 2, 1]
      ],
      basis: [0, 1],
      isMaximization: false
    },
    solved: {
      table: [
        ["1", "0", "1", "1", "2"],
        ["0", "1", "2", "-1", "1"],
        ["0", "0", "1", "0", "-5"]
      ]
    }
  },
  {
    task: {
      fn: [-1, -2, -3, 4, 0],
      constraints: [
        [1, 1, -1, 1, 2],
        [1, 14, 10, -10, 24]
      ],
      basis: [0, 2],
      isMaximization: false
    },
    solved: {
      table: [
        ["1", "24/11", "0", "0", "4"],
        ["0", "13/11", "1", "-1", "2"],
        ["0", "41/11", "0", "1", "-10"]
      ]
    }
  },
  {
    task: {
      fn: [1, 1, 1, 1, 0],
      constraints: [
        [1, 2, 2, 1, 4],
        [1, -1, 1, 5, 1]
      ],
      basis: [1, 2],
      isMaximization: false
    },
    comment: "Minimization example",
    solved: {
      table: [
        ["-1/4", "1", "0", "-9/4", "1/2"],
        ["3/4", "0", "1", "11/4", "3/2"],
        ["1/2", "0", "0", "1/2", "2"]
      ]
    }
  },
  {
    task: {
      fn: [1, 1, -1, 1, -2],
      constraints: [
        [8, 1, 1, 1, -2, 10],
        [6, 1, 2, 3, -4, 20],
        [10, 1, 3, 6, -7, 30]
      ],
      basis: [],
      isMaximization: true
    },
    comment: "Artificial basis example"
  }
];

interface TaskLibraryProps {
  onTaskSelect: (task: LPTask) => void;
}

export const TaskLibrary: React.FC<TaskLibraryProps> = ({ onTaskSelect }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleTaskSelect = (taskFromFile: TaskFromFile) => {
    const lpTask = parseTask(taskFromFile);
    onTaskSelect(lpTask);
  };

  return (
    <div className="task-library">
      <div className="library-header">
        <h3>Task Library</h3>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="expand-button"
        >
          {isExpanded ? '▼' : '▶'} Examples
        </button>
      </div>

      {isExpanded && (
        <div className="predefined-tasks">
          {predefinedTasks.map((task, index) => (
            <div key={index} className="predefined-task-item">
              <div className="task-preview">
                <div className="task-meta">
                  <span className="task-size">
                    {task.task.constraints.length}×{task.task.fn.length}
                  </span>
                  <span className={`task-mode ${task.task.isMaximization ? 'max' : 'min'}`}>
                    {task.task.isMaximization ? 'MAX' : 'MIN'}
                  </span>
                </div>
                <div className="task-description">
                  {task.comment || `Task ${index + 1}`}
                </div>
                {task.solved && (
                  <div className="task-solved">✔️ Solved</div>
                )}
              </div>
              <button 
                onClick={() => handleTaskSelect(task)}
                className="load-task-button"
              >
                Load
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
