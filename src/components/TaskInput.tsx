import React, { useState } from 'react';
import { LPTask } from '../types';
import Fraction from 'fraction.js';

interface TaskInputProps {
  onSubmit: (task: LPTask) => void;
}

export const TaskInput: React.FC<TaskInputProps> = ({ onSubmit }) => {
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(3);
  const [isMaximization, setIsMaximization] = useState(true);
  const [objective, setObjective] = useState<string[]>(['1', '1']);
  const [constraints, setConstraints] = useState<string[][]>([
    ['1', '2', '8'],
    ['1', '1', '6']
  ]);
  const [basis, setBasis] = useState<string[]>(['0', '1']);

  const updateDimensions = (newRows: number, newCols: number) => {
    setRows(newRows);
    setCols(newCols);

    const newObjective = [...objective];
    while (newObjective.length < newCols) newObjective.push('1');
    while (newObjective.length > newCols) newObjective.pop();
    setObjective(newObjective);

    const newConstraints = [...constraints];
    while (newConstraints.length < newRows) {
      newConstraints.push(Array(newCols + 1).fill('1'));
    }
    while (newConstraints.length > newRows) newConstraints.pop();

    newConstraints.forEach(row => {
      while (row.length < newCols + 1) row.push('1');
      while (row.length > newCols + 1) row.pop();
    });
    setConstraints(newConstraints);

    const newBasis = [...basis];
    while (newBasis.length < newRows) newBasis.push((newBasis.length).toString());
    while (newBasis.length > newRows) newBasis.pop();
    setBasis(newBasis);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const task: LPTask = {
        fn: objective.map(coeff => new Fraction(coeff)),
        constraints: constraints.map(row =>
          row.map(cell => new Fraction(cell))
        ),
        basis: basis.map(idx => parseInt(idx)),
        isMaximization
      };

      onSubmit(task);
    } catch (error) {
      alert('Invalid input. Please check your coefficients.');
    }
  };

  return (
    <div className="task-input">
      <h2>Enter LP Problem</h2>

      <form onSubmit={handleSubmit}>
        <div className="dimension-controls">
          <div className="dimension-group">
            <label>Constraints (rows):</label>
            <input
              type="number"
              min="1"
              max="16"
              value={rows}
              onChange={(e) => updateDimensions(parseInt(e.target.value), cols)}
            />
          </div>

          <div className="dimension-group">
            <label>Variables (columns):</label>
            <input
              type="number"
              min="1"
              max="16"
              value={cols}
              onChange={(e) => updateDimensions(rows, parseInt(e.target.value))}
            />
          </div>
        </div>

        <div className="objective-function">
          <h3>Objective Function</h3>
          <div className="objective-type">
            <label>
              <input
                type="radio"
                checked={isMaximization}
                onChange={() => setIsMaximization(true)}
              />
              Maximize
            </label>
            <label>
              <input
                type="radio"
                checked={!isMaximization}
                onChange={() => setIsMaximization(false)}
              />
              Minimize
            </label>
          </div>

          <div className="coefficients">
            {objective.map((coeff, index) => (
              <div key={index} className="coeff-input">
                <label>x{index + 1}:</label>
                <input
                  type="text"
                  value={coeff}
                  onChange={(e) => {
                    const newObjective = [...objective];
                    newObjective[index] = e.target.value;
                    setObjective(newObjective);
                  }}
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="constraints">
          <h3>Constraints</h3>
          {constraints.map((row, rowIndex) => (
            <div key={rowIndex} className="constraint-row">
              {row.map((coeff, colIndex) => (
                <>
                  <input
                    key={colIndex}
                    type="text"
                    value={coeff}
                    onChange={(e) => {
                      const newConstraints = [...constraints];
                      newConstraints[rowIndex][colIndex] = e.target.value;
                      setConstraints(newConstraints);
                    }}
                    placeholder="0"
                    className={colIndex === cols ? 'rhs-input' : ''}
                  />
                  <span className="constraint-label">
                    {colIndex === cols ? '≤ 0' : `x${colIndex + 1} +`}
                  </span>
                </>
              ))}
            </div>
          ))}
        </div>

        <div className="basis-input">
          <h3>Basis Variables (indices)</h3>
          <div className="basis-coefficients">
            {basis.map((basisIndex, index) => (
              <div key={index} className="basis-input-item">
                <label>Constraint {index + 1}:</label>
                <input
                  type="text"
                  value={basisIndex}
                  onChange={(e) => {
                    const newBasis = [...basis];
                    newBasis[index] = e.target.value;
                    setBasis(newBasis);
                  }}
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        </div>

        <button type="submit" className="submit-button">
          Set Problem
        </button>
      </form>
    </div>
  );
};
