import { useState } from "react";
import Fraction from "fraction.js";
import { LPTask } from "../simplex/types";
import { SimplexSolver } from "../simplex/SimplexSolver";
import { ArtificialBasisSolver } from "../simplex/ArtificialSolver";
import { needsArtificialBasis } from "../simplex/SimplexSolver";

export type StepData = {
  stepNumber: number;
  basis: number[];
  table: Fraction[][];
  possiblePivots: { row: number; col: number; ratio: Fraction }[];
  selectedPivot?: { row: number; col: number };
  isComplete: boolean;
  value?: Fraction;
  message?: string;
};

export function useSimplexSolver() {
  const [steps, setSteps] = useState<StepData[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [error, setError] = useState("");

  const findAllPossiblePivots = (solver: SimplexSolver) => {
    const fn = solver.fn;
    const table = solver.table;
    const basis = solver.basis;
    const possiblePivots: { row: number; col: number; ratio: Fraction }[] = [];

    for (let col = 0; col < fn.length - 1; col++) {
      if (basis.includes(col) || fn[col].gte(0)) continue;

      for (let row = 0; row < table.length - 1; row++) {
        const alpha = table[row][col];
        const beta = table[row][table[row].length - 1];
        if (alpha.gt(0)) {
          possiblePivots.push({ row, col, ratio: beta.div(alpha) });
        }
      }
    }

    return possiblePivots;
  };

  const solveAuto = (task: LPTask, useArtificialBasis: boolean) => {
    setError("");
    try {
      const allSteps: StepData[] = [];

      if (useArtificialBasis || needsArtificialBasis(task)) {
        const solver = new ArtificialBasisSolver(task);
        const result = solver.solve();

        if (result.hasSolution) {
          allSteps.push({
            stepNumber: 0,
            basis: [],
            table: [],
            possiblePivots: [],
            isComplete: true,
            value: result.value,
            message: `Решение найдено методом искусственного базиса\n${result.solution
              .map((v, i) => `x${i + 1} = ${v.toFraction()}`)
              .join(
                ", ",
              )}\nЗначение целевой функции: ${result.value.toFraction()}`,
          });
        } else {
          allSteps.push({
            stepNumber: 0,
            basis: [],
            table: [],
            possiblePivots: [],
            isComplete: true,
            message: "Задача не имеет решения (метод искусственного базиса)",
          });
        }
      } else {
        const solver = new SimplexSolver(task);
        let stepNum = 0;

        while (true) {
          const branch = solver.chooseBranch();
          const currentState = solver.getCurrentState();

          if (branch === "Success") {
            const value = solver.fn[solver.fn.length - 1].neg();
            allSteps.push({
              stepNumber: stepNum,
              basis: [...currentState.basis],
              table: currentState.table.map((row: Fraction[]) => [...row]),
              possiblePivots: [],
              isComplete: true,
              value: value,
              message: `Оптимальное решение найдено!\nЗначение: ${value.toFraction()}`,
            });
            break;
          } else if (branch === "No limit") {
            allSteps.push({
              stepNumber: stepNum,
              basis: [...currentState.basis],
              table: currentState.table.map((row: Fraction[]) => [...row]),
              possiblePivots: [],
              isComplete: true,
              message: "Целевая функция не ограничена",
            });
            break;
          } else {
            const pivot = solver.findBestPivot();
            if (!pivot) break;
            allSteps.push({
              stepNumber: stepNum,
              basis: [...currentState.basis],
              table: currentState.table.map((row: Fraction[]) => [...row]),
              possiblePivots: [pivot],
              selectedPivot: { row: pivot.row, col: pivot.col },
              isComplete: false,
            });

            solver.calculateStep();
            stepNum++;
          }
        }
      }

      setSteps(allSteps);
      setCurrentStepIndex(allSteps.length - 1);
      return true;
    } catch (e: any) {
      setError(`Ошибка при решении: ${e.message}`);
      return false;
    }
  };

  const startStepMode = (task: LPTask, useArtificialBasis: boolean) => {
    setError("");
    try {
      if (useArtificialBasis || needsArtificialBasis(task)) {
        setError(
          "Пошаговый режим доступен только для задач с заданным допустимым базисом",
        );
        return false;
      }

      const solver = new SimplexSolver(task);
      const initialState = solver.getCurrentState();
      const branch = solver.chooseBranch();

      if (branch === "Success") {
        const value = solver.fn[solver.fn.length - 1].neg();
        setSteps([
          {
            stepNumber: 0,
            basis: [...initialState.basis],
            table: initialState.table.map((row: Fraction[]) => [...row]),
            possiblePivots: [],
            isComplete: true,
            value: value,
            message: "Начальный базис уже оптимален!",
          },
        ]);
        setCurrentStepIndex(0);
        return true;
      }

      const possiblePivots = findAllPossiblePivots(solver);
      setSteps([
        {
          stepNumber: 0,
          basis: [...initialState.basis],
          table: initialState.table.map((row: Fraction[]) => [...row]),
          possiblePivots,
          isComplete: false,
        },
      ]);
      setCurrentStepIndex(0);
      return true;
    } catch (e: any) {
      setError(`Ошибка: ${e.message}`);
      return false;
    }
  };

  const executeStepWithPivot = (
    task: LPTask,
    pivotRow: number,
    pivotCol: number,
  ) => {
    try {
      const solver = new SimplexSolver(task);

      for (let i = 0; i < currentStepIndex; i++) {
        const step = steps[i];
        if (step.selectedPivot) {
          const [rows, cols] = [solver.table.length, solver.table[0].length];
          const newTable: Fraction[][] = Array(rows)
            .fill(null)
            .map(() =>
              Array(cols)
                .fill(null)
                .map(() => new Fraction(0)),
            );

          const pRow = step.selectedPivot.row;
          const pCol = step.selectedPivot.col;
          const pivot = solver.table[pRow][pCol];
          solver.basis[pRow] = pCol;

          for (let j = 0; j < cols; j++) {
            newTable[pRow][j] = solver.table[pRow][j].div(pivot);
          }

          for (let k = 0; k < rows; k++) {
            if (k === pRow) continue;
            for (let j = 0; j < cols; j++) {
              newTable[k][j] = solver.table[k][j].sub(
                solver.table[k][pCol].mul(newTable[pRow][j]),
              );
            }
          }

          solver.table = newTable;
          solver.stepNumber++;
        }
      }

      const currentState = solver.getCurrentState();
      currentState.basis[pivotRow] = pivotCol;

      const [rows, cols] = [solver.table.length, solver.table[0].length];
      const newTable: Fraction[][] = Array(rows)
        .fill(null)
        .map(() =>
          Array(cols)
            .fill(null)
            .map(() => new Fraction(0)),
        );

      const pivot = solver.table[pivotRow][pivotCol];

      for (let i = 0; i < cols; i++) {
        newTable[pivotRow][i] = solver.table[pivotRow][i].div(pivot);
      }

      for (let i = 0; i < rows; i++) {
        if (i === pivotRow) continue;
        for (let j = 0; j < cols; j++) {
          newTable[i][j] = solver.table[i][j].sub(
            solver.table[i][pivotCol].mul(newTable[pivotRow][j]),
          );
        }
      }

      solver.table = newTable;
      solver.basis = [...currentState.basis];
      solver.stepNumber++;

      const branch = solver.chooseBranch();
      const newState = solver.getCurrentState();

      if (branch === "Success") {
        const value = solver.fn[solver.fn.length - 1].neg();
        const newSteps = [
          ...steps.slice(0, currentStepIndex + 1),
          {
            ...steps[currentStepIndex],
            selectedPivot: { row: pivotRow, col: pivotCol },
          },
          {
            stepNumber: currentStepIndex + 1,
            basis: [...newState.basis],
            table: newState.table.map((row: Fraction[]) => [...row]),
            possiblePivots: [],
            isComplete: true,
            value: value,
            message: `Оптимальное решение найдено!\nЗначение: ${value.toFraction()}`,
          },
        ];
        setSteps(newSteps);
        setCurrentStepIndex(newSteps.length - 1);
      } else if (branch === "No limit") {
        const newSteps = [
          ...steps.slice(0, currentStepIndex + 1),
          {
            ...steps[currentStepIndex],
            selectedPivot: { row: pivotRow, col: pivotCol },
          },
          {
            stepNumber: currentStepIndex + 1,
            basis: [...newState.basis],
            table: newState.table.map((row: Fraction[]) => [...row]),
            possiblePivots: [],
            isComplete: true,
            message: "Целевая функция не ограничена",
          },
        ];
        setSteps(newSteps);
        setCurrentStepIndex(newSteps.length - 1);
      } else {
        const possiblePivots = findAllPossiblePivots(solver);
        const newSteps = [
          ...steps.slice(0, currentStepIndex + 1),
          {
            ...steps[currentStepIndex],
            selectedPivot: { row: pivotRow, col: pivotCol },
          },
          {
            stepNumber: currentStepIndex + 1,
            basis: [...newState.basis],
            table: newState.table.map((row: Fraction[]) => [...row]),
            possiblePivots,
            isComplete: false,
          },
        ];
        setSteps(newSteps);
        setCurrentStepIndex(newSteps.length - 1);
      }
    } catch (e: any) {
      setError(`Ошибка: ${e.message}`);
    }
  };

  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const goToNextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const reset = () => {
    setSteps([]);
    setCurrentStepIndex(-1);
    setError("");
  };

  return {
    steps,
    currentStepIndex,
    currentStep: currentStepIndex >= 0 ? steps[currentStepIndex] : null,
    error,
    setError,
    solveAuto,
    startStepMode,
    executeStepWithPivot,
    goToPreviousStep,
    goToNextStep,
    reset,
  };
}
