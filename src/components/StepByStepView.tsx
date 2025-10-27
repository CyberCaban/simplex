import React, { useState } from 'react';
import { ExtendedSimplexSolver } from '../simplex/SimplexSolver';

interface StepByStepViewProps {
  solution: any;
  onAction: (action: 'next' | 'prev' | 'pivot', pivot?: { row: number; col: number }) => void;
  solver: ExtendedSimplexSolver | null;
}

export const StepByStepView: React.FC<StepByStepViewProps> = ({
  solution,
  onAction,
  solver
}) => {
  const [selectedPivot, setSelectedPivot] = useState<{ row: number; col: number } | null>(null);

  if (!solution.stepByStepMode) {
    return null;
  }

  const handlePivotSelect = (row: number, col: number) => {
    setSelectedPivot({ row, col });
  };

  const handleNextWithPivot = () => {
    if (selectedPivot) {
      onAction('pivot', selectedPivot);
      setSelectedPivot(null);
    } else {
      onAction('next');
    }
  };

  const renderTable = () => {
    if (!solution.currentState) return null;

    const { table, basis } = solution.currentState;
    const rows = table.length;
    const cols = table[0]?.length || 0;

    return (
      <div className="simplex-table">
        <h4>Simplex Table - Step {solution.stepNumber}</h4>
        <table>
          <thead>
            <tr>
              <th>Basis</th>
              {Array.from({ length: cols }, (_, i) => (
                <th key={i}>
                  {i === cols - 1 ? 'β' : `x${i + 1}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.map((row: any[], rowIndex: number) => (
              <tr key={rowIndex}>
                <td className="basis-cell">
                  {rowIndex < basis.length ? `x${basis[rowIndex] + 1}` : 'Z'}
                </td>
                {row.map((cell, colIndex) => (
                  <td
                    key={colIndex}
                    className={
                      selectedPivot?.row === rowIndex && selectedPivot?.col === colIndex
                        ? 'selected-pivot'
                        : ''
                    }
                    onClick={() => rowIndex < rows - 1 && colIndex < cols - 1 && handlePivotSelect(rowIndex, colIndex)}
                  >
                    {cell.toString()}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="step-by-step-view">
      <h2>Step-by-Step Solution</h2>

      <div className="step-controls">
        <button onClick={() => onAction('prev')} disabled={solution.stepNumber === 0}>
          Previous Step
        </button>

        <button
          onClick={handleNextWithPivot}
          disabled={!solver}
        >
          {selectedPivot ? 'Next Step with Selected Pivot' : 'Next Step (Auto Pivot)'}
        </button>

        {selectedPivot && (
          <div className="selected-pivot-info">
            Selected pivot: Row {selectedPivot.row + 1}, Column {selectedPivot.col + 1}
            <button onClick={() => setSelectedPivot(null)}>Clear</button>
          </div>
        )}
      </div>

      {renderTable()}

      <div className="current-basis">
        <h4>Current Basis:</h4>
        <div className="basis-variables">
          {solution.currentState?.basis.map((b: number, idx: number) => (
            <span key={idx} className="basis-var">x{b + 1}</span>
          ))}
        </div>
      </div>
    </div>
  );
};
