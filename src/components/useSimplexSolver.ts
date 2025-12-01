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
        console.log("useArtificialBasis", needsArtificialBasis(task));
        try {
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
              message:
                "Задача не имеет решения: система ограничений несовместна или искусственные переменные не удалось исключить",
            });
          }
        } catch (e: any) {
          allSteps.push({
            stepNumber: 0,
            basis: [],
            table: [],
            possiblePivots: [],
            isComplete: true,
            message: `Ошибка при решении: ${e.message}`,
          });
        }
      } else {
        const solver = new SimplexSolver(task);
        let stepNum = 0;

        const initialState = solver.getCurrentState();
        allSteps.push({
          stepNumber: 0,
          basis: [...initialState.basis],
          table: initialState.table.map((row: Fraction[]) => [...row]),
          possiblePivots: [],
          isComplete: false,
          message: "Начальная симплекс-таблица",
        });

        while (true) {
          const branch = solver.chooseBranch();
          const currentState = solver.getCurrentState();
          const { values: xs, value: f } = solver.getCurrentPoint();
          if (branch === "Success") {
            allSteps.push({
              stepNumber: stepNum,
              basis: [...currentState.basis],
              table: currentState.table.map((row: Fraction[]) => [...row]),
              possiblePivots: [],
              isComplete: true,
              value: f,
              message: `Оптимальное решение найдено!\nЗначение: ${f.toFraction()}\nТочка: (${xs.join(", ")})`,
            });
            break;
          } else if (branch === "No limit") {
            allSteps.push({
              stepNumber: stepNum,
              basis: [...currentState.basis],
              table: currentState.table.map((row: Fraction[]) => [...row]),
              possiblePivots: [],
              isComplete: true,
              message:
                "Целевая функция не ограничена снизу: задача не имеет оптимального решения",
            });
            break;
          } else {
            const pivot = solver.findBestPivot();
            if (!pivot) {
              allSteps.push({
                stepNumber: stepNum,
                basis: [...currentState.basis],
                table: currentState.table.map((row: Fraction[]) => [...row]),
                possiblePivots: [],
                isComplete: true,
                message: "Ошибка: не найден опорный элемент",
              });
              break;
            }

            stepNum++;
            solver.calculateStep();

            const newState = solver.getCurrentState();
            allSteps.push({
              stepNumber: stepNum,
              basis: [...newState.basis],
              table: newState.table.map((row: Fraction[]) => [...row]),
              possiblePivots: [pivot],
              selectedPivot: { row: pivot.row, col: pivot.col },
              isComplete: false,
              message: `Шаг ${stepNum}: опорный элемент в строке ${pivot.row + 1}, столбце x${pivot.col + 1}`,
            });
          }
        }
      }

      setSteps(allSteps);
      setCurrentStepIndex(0);
      return true;
    } catch (e: any) {
      setError(`Ошибка при решении: ${e.message}`);
      return false;
    }
  };

  const startStepMode = (task: LPTask) => {
    setError("");
    try {
      const solver = new SimplexSolver(task);
      const initialState = solver.getCurrentState();
      const branch = solver.chooseBranch();

      if (branch === "Success") {
        const { values: xs, value: f } = solver.getCurrentPoint();
        setSteps([
          {
            stepNumber: 0,
            basis: [...initialState.basis],
            table: initialState.table.map((row: Fraction[]) => [...row]),
            possiblePivots: [],
            isComplete: true,
            value: f,
            message: `Базис уже оптимален!\nЗначение: ${f.toFraction()}\nТочка: (${xs.join(", ")})`,
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
          message: "Начальная симплекс-таблица. Выберите опорный элемент.",
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
        const { values: xs, value: f } = solver.getCurrentPoint();
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
            value: f,
            message: `Оптимальное решение найдено!\nЗначение: ${f.toFraction()}\nТочка: (${xs.join(", ")})`,
          },
        ];
        setSteps(newSteps);
        setCurrentStepIndex(currentStepIndex + 1);
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
            message:
              "Целевая функция не ограничена снизу: задача не имеет оптимального решения",
          },
        ];
        setSteps(newSteps);
        setCurrentStepIndex(currentStepIndex + 1);
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
            message: "Выберите опорный элемент для следующего шага",
          },
        ];
        setSteps(newSteps);
        setCurrentStepIndex(currentStepIndex + 1);
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
