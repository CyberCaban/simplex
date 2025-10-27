import { useState, useRef } from 'react';
import { LPTask } from './types';
import { TaskInput } from './components/TaskInput';
import { SolutionView } from './components/SolutionView';
import { StepByStepView } from './components/StepByStepView';
import './App.css';
import { ExtendedSimplexSolver, needsArtificialBasis, SimplexSolver } from './simplex/SimplexSolver';
import { ArtificialBasisSolver } from './simplex/ArtificialSolver';

type SolutionMode = 'auto' | 'step-by-step';
type SolverType = 'simplex' | 'artificial';

export default function App() {
  const [task, setTask] = useState<LPTask | null>(null);
  const [solutionMode, setSolutionMode] = useState<SolutionMode>('auto');
  const [solverType, setSolverType] = useState<SolverType>('simplex');
  const [solution, setSolution] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [isSolving, setIsSolving] = useState(false);

  const simplexSolverRef = useRef<ExtendedSimplexSolver | null>(null);
  const artificialSolverRef = useRef<ArtificialBasisSolver | null>(null);

  const handleTaskSubmit = (newTask: LPTask) => {
    setTask(newTask);
    setSolution(null);
    setError('');
    simplexSolverRef.current = null;
    artificialSolverRef.current = null;
  };

  const solveAuto = async () => {
    if (!task) return;

    setIsSolving(true);
    setError('');

    try {
      let result;
      if (solverType === 'artificial' || needsArtificialBasis(task)) {
        const solver = new ArtificialBasisSolver(task);
        artificialSolverRef.current = solver;
        result = solver.solve();
      } else {
        const solver = new SimplexSolver(task);
        result = {
          solution: [],
          value: solver.simplexStep(),
          hasSolution: true
        };
      }

      setSolution(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsSolving(false);
    }
  };

  const startStepByStep = () => {
    if (!task) return;

    setError('');

    try {
      if (solverType === 'artificial' || needsArtificialBasis(task)) {
        const solver = new ArtificialBasisSolver(task);
        artificialSolverRef.current = solver;
        setSolution({ stepByStepMode: true, solver: 'artificial' });
      } else {
        const solver = new ExtendedSimplexSolver(task);
        simplexSolverRef.current = solver;
        setSolution({
          stepByStepMode: true,
          solver: 'simplex',
          currentState: solver.getCurrentState(),
          stepNumber: 0
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  };

  const handleSolve = () => {
    if (solutionMode === 'auto') {
      solveAuto();
    } else {
      startStepByStep();
    }
  };

  const handleStepByStepAction = (action: 'next' | 'prev' | 'pivot', pivot?: { row: number; col: number }) => {
    if (!simplexSolverRef.current || !solution?.stepByStepMode) return;

    try {
      if (action === 'next') {
        simplexSolverRef.current.calculateStep();
        setSolution({
          ...solution,
          currentState: simplexSolverRef.current.getCurrentState(),
          stepNumber: solution.stepNumber + 1
        });
      } else if (action === 'pivot' && pivot) {
        // Здесь можно реализовать логику для выбора опорного элемента
        // Пока используем стандартный выбор
        simplexSolverRef.current.calculateStep();
        setSolution({
          ...solution,
          currentState: simplexSolverRef.current.getCurrentState(),
          stepNumber: solution.stepNumber + 1
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Step execution error');
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Simplex Method Solver</h1>
      </header>

      <div className="app-content">
        <div className="control-panel">
          <TaskInput onSubmit={handleTaskSubmit} />

          <div className="solution-controls">
            <div className="mode-selectors">
              <div className="selector-group">
                <label>Solution Mode:</label>
                <select
                  value={solutionMode}
                  onChange={(e) => setSolutionMode(e.target.value as SolutionMode)}
                >
                  <option value="auto">Auto</option>
                  <option value="step-by-step">Step by Step</option>
                </select>
              </div>

              <div className="selector-group">
                <label>Solver Type:</label>
                <select
                  value={solverType}
                  onChange={(e) => setSolverType(e.target.value as SolverType)}
                >
                  <option value="simplex">Simplex</option>
                  <option value="artificial">Artificial Basis</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleSolve}
              disabled={!task || isSolving}
              className="solve-button"
            >
              {isSolving ? 'Solving...' : 'Solve'}
            </button>
          </div>
        </div>

        {error && (
          <div className="error-message">
            Error: {error}
          </div>
        )}

        {solution && (
          <div className="solution-container">
            {solution.stepByStepMode ? (
              <StepByStepView
                solution={solution}
                onAction={handleStepByStepAction}
                solver={simplexSolverRef.current}
              />
            ) : (
              <SolutionView solution={solution} task={task} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
