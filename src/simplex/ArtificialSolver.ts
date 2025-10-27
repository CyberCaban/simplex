import Fraction from "fraction.js";
import { Matrix, LPTask, Solution } from "../types";
import { SimplexSolver } from "./SimplexSolver";

export class ArtificialBasisSolver {
  private originalTask: LPTask;
  private artificialTask: LPTask;
  private hasSolution: boolean = false;
  private solution: Fraction[] = [];

  constructor(lpTask: LPTask) {
    this.originalTask = lpTask;
    this.artificialTask = this.createArtificialTask(lpTask);
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
      isMaximization: false
    };
  }

  solve(): Solution {
    // artificial phase
    const phase1Solver = new SimplexSolver(this.artificialTask);

    try {
      const artificialValue = phase1Solver.simplexStep();
      if (artificialValue.abs().valueOf() > 1e-10) {
        this.hasSolution = false;
        return { solution: [], value: new Fraction(0), hasSolution: false };
      }
      this.hasSolution = true;
      return this.solvePhase2(phase1Solver);

    } catch (error) {
      console.log("Error when solving artificial task:", error);
      this.hasSolution = false;
      return { solution: [], value: new Fraction(0), hasSolution: false };
    }
  }

  private solvePhase2(phase1Solver: SimplexSolver): Solution {
    // original phase
    const { basis } = phase1Solver;
    const totalOriginalVars = this.originalTask.constraints[0].length - 1;
    const filteredBasis = basis.filter(basisIndex => basisIndex < totalOriginalVars);
    const neededBasisSize = this.originalTask.constraints.length;
    let finalBasis = [...filteredBasis];

    if (filteredBasis.length < neededBasisSize) {
      const availableVars = Array.from({ length: totalOriginalVars }, (_, i) => i)
        .filter(i => !filteredBasis.includes(i));

      for (let i = filteredBasis.length; i < neededBasisSize && availableVars.length > 0; i++) {
        finalBasis.push(availableVars.shift()!);
      }
    }

    const phase2Task: LPTask = {
      constraints: this.originalTask.constraints,
      basis: finalBasis,
      fn: this.originalTask.fn,
      isMaximization: this.originalTask.isMaximization
    };

    try {
      const phase2Solver = new SimplexSolver(phase2Task);
      const optimalValue = phase2Solver.simplexStep();
      this.solution = this.extractSolution(phase2Solver, totalOriginalVars);

      // console.log("Фаза II: Оптимальное решение найдено");
      console.log(`Optimal: ${optimalValue.toString()}`);

      return {
        solution: this.solution,
        value: optimalValue,
        hasSolution: true
      };

    } catch (error) {
      console.log("Ошибка при решении оригинальной задачи:", error);
      return { solution: [], value: new Fraction(0), hasSolution: false };
    }
  }

  private extractSolution(solver: SimplexSolver, totalVars: number): Fraction[] {
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
      hasSolution: this.hasSolution
    };
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
      console.error("No solution")
      return;
    }

    this.solution.forEach((value, index) => {
      console.log(`x${index + 1} = ${value.toString()}`);
    });

    const objectiveValue = this.calculateObjectiveValue();
    console.log(`Target function: ${objectiveValue.toString()}`);
  }
}
