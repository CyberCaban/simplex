import React from 'react';
import { LPTask } from '../types';
import Fraction from 'fraction.js';

interface Solution {
  solution: Fraction[];
  value: Fraction;
  hasSolution: boolean;
}

interface SolutionViewProps {
  solution: Solution;
  task: LPTask | null;
}

export const SolutionView: React.FC<SolutionViewProps> = ({ solution, task }) => {
  if (!solution.hasSolution) {
    return (
      <div className="solution-view">
        <h2>Solution</h2>
        <div className="no-solution">
          The problem has no solution or is unbounded.
        </div>
      </div>
    );
  }

  return (
    <div className="solution-view">
      <h2>Solution</h2>

      <div className="solution-variables">
        <h3>Optimal Values:</h3>
        {solution.solution.map((value, index) => (
          <div key={index} className="variable-solution">
            x<sub>{index + 1}</sub> = {value.toString()}
          </div>
        ))}
      </div>

      <div className="objective-value">
        <h3>Optimal Objective Value:</h3>
        <div className="value">
          {task?.isMaximization ? 'Max Z = ' : 'Min Z = '}
          {solution.value.toString()}
        </div>
      </div>

      {task && (
        <div className="verification">
          <h3>Verification</h3>
          <div className="original-function">
            Original function:
            {task.fn.map((coeff, idx) => (
              <span key={idx}>
                {idx > 0 && coeff.valueOf() >= 0 && '+'}
                {coeff.toString()}x<sub>{idx + 1}</sub>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
