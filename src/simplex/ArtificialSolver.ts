import Fraction from "fraction.js";
import { Matrix, LPTask, Solution } from "./types";
import { SimplexSolver } from "./SimplexSolver";
import { StepData } from "../components/useSimplexSolver";

export class ArtificialBasisSolver {
  private originalTask: LPTask;
  private artificialTask: LPTask;
  private hasSolution: boolean = false;
  private solution: Fraction[] = [];
  private steps: StepData[] = [];

  constructor(lpTask: LPTask) {
    this.originalTask = lpTask;
    this.artificialTask = this.createArtificialTask(lpTask);
  }

  getSteps(): StepData[] {
    return this.steps;
  }

  private createArtificialTask(originalTask: LPTask): LPTask {
    const { constraints } = originalTask;

    const numArtificialVars = constraints.length;
    const totalVars = constraints[0].length - 1;

    const newConstraints: Matrix = constraints.map((row, i) => {
      const newRow: Fraction[] = [];
      for (let j = 0; j < totalVars; j++) {
        newRow.push(row[j]);
      }
      for (let j = 0; j < numArtificialVars; j++) {
        newRow.push(new Fraction(i === j ? 1 : 0));
      }
      newRow.push(row[row.length - 1]);

      return newRow;
    });

    const artificialBasis: number[] = [];
    for (let i = 0; i < numArtificialVars; i++) {
      artificialBasis.push(totalVars + i);
    }
    const artificialFn: Fraction[] = [];
    for (let i = 0; i < totalVars; i++) {
      artificialFn.push(new Fraction(0));
    }
    for (let i = 0; i < numArtificialVars; i++) {
      artificialFn.push(new Fraction(1));
    }
    return {
      constraints: newConstraints,
      basis: artificialBasis,
      fn: artificialFn,
      isMaximization: false,
    };
  }

  solve(): Solution {
    // artificial phase
    const phase1Solver = new SimplexSolver(this.artificialTask);
    this.steps.push({
      stepNumber: this.steps.length,
      basis: [...phase1Solver.basis],
      table: phase1Solver.table.map((row: Fraction[]) => [...row]),
      possiblePivots: [
        // ...phase1Solver.getPossiblePivots()
      ],
      isComplete: false,
      message: "Начальная симплекс-таблица",
    });
    try {
      while (true) {
        const branch = phase1Solver.chooseBranch()
        const currentState = phase1Solver.getCurrentState()
        if (branch === "Success") {
            const { values: xs, value: f } = phase1Solver.getCurrentPoint();

            const negativeVars = xs
              .map((value, index) => ({ index, value }))
              .filter((item) => item.value.lt(0));

            if (negativeVars.length > 0) {
              this.steps.push({
                stepNumber: this.steps.length,
                basis: [...currentState.basis],
                table: currentState.table.map((row: Fraction[]) => [...row]),
                possiblePivots: [],
                isComplete: true,
                value: f,
                message:
                  `Ошибка: Получено решение с отрицательными значениями переменных!\n` +
                  `${negativeVars
                    .map((v) => `x${v.index + 1} = ${v.value.toFraction()} < 0`)
                    .join("\n")}\n` +
                  `Задача в канонической форме требует x_i ≥ 0. Проверьте правильность ввода ограничений.`,
              });
            } else {
              this.steps.push({
                stepNumber: this.steps.length,
                basis: [...currentState.basis],
                table: currentState.table.map((row: Fraction[]) => [...row]),
                possiblePivots: [],
                isComplete: true,
                value: f,
                message: `Оптимальное решение найдено!\nЗначение: ${f.toFraction()}\nТочка: (${xs.join(
                  ", "
                )})`,
              });
            }
            break
        } else if (branch === "No limit") {

            this.steps.push({
              stepNumber: this.steps.length,
              basis: [...currentState.basis],
              table: currentState.table.map((row: Fraction[]) => [...row]),
              possiblePivots: [],
              isComplete: true,
              message:
                "Целевая функция не ограничена снизу: задача не имеет оптимального решения",
            });
            break;
          } else {
            const pivot = phase1Solver.findBestPivot();
            if (!pivot) {
              this.steps.push({
                stepNumber: this.steps.length,
                basis: [...currentState.basis],
                table: currentState.table.map((row: Fraction[]) => [...row]),
                possiblePivots: [],
                isComplete: true,
                message: "Ошибка: не найден опорный элемент",
              });
              break;
            }

            phase1Solver.calculateStep();

            const newState = phase1Solver.getCurrentState();
            this.steps.push({
              stepNumber: this.steps.length,
              basis: [...newState.basis],
              table: newState.table.map((row: Fraction[]) => [...row]),
              possiblePivots: [pivot],
              selectedPivot: { row: pivot.row, col: pivot.col },
              isComplete: false,
              message: `Шаг ${this.steps.length}: опорный элемент в строке ${
                pivot.row + 1
              }, столбце x${pivot.col + 1}`,
            });
          }
      }

      const artificialValue = phase1Solver.getSuccessValue()
      if (artificialValue.abs().valueOf() > 1e-10) {
        this.hasSolution = false;
        this.steps.push({
          stepNumber: this.steps.length,
          basis: [...phase1Solver.basis],
          table: phase1Solver.table.map((row: Fraction[]) => [...row]),
          possiblePivots: [
            // ...phase1Solver.getPossiblePivots()
          ],
          isComplete: true,
          message:
            `Система ограничений несовместна: сумма искусственных переменных = ${artificialValue.toFraction()} ≠ 0. Задача не имеет допустимых решений.`,
        });
        throw Error(
          `Система ограничений несовместна: сумма искусственных переменных = ${artificialValue.toFraction()} ≠ 0. Задача не имеет допустимых решений.`
        );
      }
      this.hasSolution = true;
      return this.solvePhase2(phase1Solver);
    } catch (error: any) {
      this.steps.push({
        stepNumber: this.steps.length,
        basis: [...phase1Solver.basis],
        table: phase1Solver.table.map((row: Fraction[]) => [...row]),
        possiblePivots: [],
        isComplete: true,
        message: "Ошибка при решении задачи с искусственным базисом:",
      });
      console.log("Ошибка при решении задачи с искусственным базисом:", error);
      this.hasSolution = false;
      throw error;
    }
  }

  private solvePhase2(phase1Solver: SimplexSolver): Solution {
    // original phase
    const { basis } = phase1Solver;
    const totalOriginalVars = this.originalTask.constraints[0].length - 1;
    const filteredBasis = basis.filter(
      (basisIndex) => basisIndex < totalOriginalVars
    );
    const neededBasisSize = this.originalTask.constraints.length;
    let finalBasis = [...filteredBasis];

    if (filteredBasis.length < neededBasisSize) {
      const availableVars = Array.from(
        { length: totalOriginalVars },
        (_, i) => i
      ).filter((i) => !filteredBasis.includes(i));

      for (
        let i = filteredBasis.length;
        i < neededBasisSize && availableVars.length > 0;
        i++
      ) {
        finalBasis.push(availableVars.shift()!);
      }
    }

    const phase2Task: LPTask = {
      constraints: this.originalTask.constraints,
      basis: finalBasis,
      fn: this.originalTask.fn,
      isMaximization: this.originalTask.isMaximization,
    };

    const phase2Solver = new SimplexSolver(phase2Task);
    try {
      this.steps.push({
        stepNumber: this.steps.length,
        basis: [...phase2Task.basis],
        table: [...phase2Solver.getCurrentState().table],
        isComplete: false,
        possiblePivots: [
          // ...phase2Solver.getPossiblePivots()
        ],
      });
      const optimalValue = phase2Solver.simplexStep();
      this.steps.push({
        stepNumber: this.steps.length,
        basis: [...phase2Task.basis],
        table: [...phase2Solver.getCurrentState().table],
        isComplete: false,
        possiblePivots: [
          // ...phase2Solver.getPossiblePivots()
        ],
      });
      this.solution = this.extractSolution(phase2Solver, totalOriginalVars);

      // console.log("Фаза II: Оптимальное решение найдено");
      console.log(`Optimal: ${optimalValue.toString()}`);

      return {
        solution: this.solution,
        value: optimalValue,
        hasSolution: true,
      };
    } catch (error: any) {
      console.log("Ошибка при решении оригинальной задачи (фаза II):", error);
      this.steps.push({
        stepNumber: this.steps.length,
        basis: [...phase2Task.basis],
        table: [...phase2Solver.getCurrentState().table],
        isComplete: false,
        possiblePivots: [
          // ...phase2Solver.getPossiblePivots()
        ],
      });
      throw Error(
        `Ошибка на второй фазе метода искусственного базиса: ${error.message}`
      );
      return {
        solution: this.solution,
        value: new Fraction(),
        hasSolution: false,
      };
    }
  }

  private extractSolution(
    solver: SimplexSolver,
    totalVars: number
  ): Fraction[] {
    const solution: Fraction[] = new Array(totalVars).fill(new Fraction(0));
    const { basis, table } = solver;
    const rows = table.length - 1;

    for (let i = 0; i < basis.length; i++) {
      const basisVar = basis[i];
      if (basisVar < totalVars) {
        for (let j = 0; j < rows; j++) {
          if (table[j][basisVar].equals(1)) {
            solution[basisVar] = table[j][table[j].length - 1];
            break;
          }
        }
      }
    }
    return solution;
  }

  getSolution(): Solution {
    return {
      solution: this.solution,
      value: this.calculateObjectiveValue(),
      hasSolution: this.hasSolution,
    };
  }

  getArtificialBasis(): number[] {
    // artificial phase
    const phase1Solver = new SimplexSolver(this.artificialTask);

    try {
      const artificialValue = phase1Solver.simplexStep();
      if (artificialValue.abs().valueOf() > 1e-10) {
        this.hasSolution = false;
        throw Error(
          `Система ограничений несовместна: сумма искусственных переменных = ${artificialValue.toFraction()} ≠ 0. Задача не имеет допустимых решений.`
        );
      }
      this.hasSolution = true;
      // original phase
      const { basis } = phase1Solver;
      const totalOriginalVars = this.originalTask.constraints[0].length - 1;
      const filteredBasis = basis.filter(
        (basisIndex) => basisIndex < totalOriginalVars
      );
      const neededBasisSize = this.originalTask.constraints.length;
      let finalBasis = [...filteredBasis];

      if (filteredBasis.length < neededBasisSize) {
        const availableVars = Array.from(
          { length: totalOriginalVars },
          (_, i) => i
        ).filter((i) => !filteredBasis.includes(i));

        for (
          let i = filteredBasis.length;
          i < neededBasisSize && availableVars.length > 0;
          i++
        ) {
          finalBasis.push(availableVars.shift()!);
        }
      }
      return finalBasis;
    } catch (error: any) {
      console.log("Ошибка при решении задачи с искусственным базисом:", error);
      throw error;
    }
  }
  private calculateObjectiveValue(): Fraction {
    if (!this.hasSolution || this.solution.length === 0) {
      return new Fraction(0);
    }

    let value = new Fraction(0);
    for (let i = 0; i < this.solution.length; i++) {
      value = value.add(this.originalTask.fn[i].mul(this.solution[i]));
    }

    return this.originalTask.isMaximization ? value : value.neg();
  }

  printSolution(): void {
    if (!this.hasSolution) {
      console.error("Задача не имеет решения");
      return;
    }

    console.log(
      this.solution
        .map((value, index) => `x${index + 1} = ${value.toString()}`)
        .join(", ")
    );

    const objectiveValue = this.calculateObjectiveValue();
    console.log(`Значение целевой функции: ${objectiveValue.toString()}`);
  }
}
