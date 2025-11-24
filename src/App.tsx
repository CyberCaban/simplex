import { useState, useEffect } from "react";
import "./App.css";
import TopBarImg from "./assets/topbar_2.png";
import Fraction from "fraction.js";
import { LPTask } from "./simplex/types";
import { SimplexTable } from "./components/SimplexTable";
import { useSimplexSolver } from "./components/useSimplexSolver";

function App() {
  const [isMaximization, setIsMaximization] = useState(false);
  const [useArtificialBasis, setUseArtificialBasis] = useState(false);
  const [numVariables, setNumVariables] = useState(2);
  const [numConstraints, setNumConstraints] = useState(2);
  const [isAutoMode, setIsAutoMode] = useState(true);

  const [fnCoeffs, setFnCoeffs] = useState<string[]>([]);
  const [constraintsData, setConstraintsData] = useState<string[][]>([]);
  const [basisSelection, setBasisSelection] = useState<boolean[]>([]);

  const {
    steps,
    currentStepIndex,
    currentStep,
    error,
    setError,
    solveAuto,
    startStepMode,
    executeStepWithPivot,
    goToPreviousStep,
    goToNextStep,
    reset,
  } = useSimplexSolver();

  useEffect(() => {
    const newFn = Array(numVariables).fill("1");
    const newConstraints = Array(numConstraints)
      .fill(null)
      .map(() => Array(numVariables + 1).fill("1"));
    const newBasis = Array(numVariables).fill(false);

    setFnCoeffs(newFn);
    setConstraintsData(newConstraints);
    setBasisSelection(newBasis);
    reset();
  }, [numVariables, numConstraints]);

  const validateInput = (): string | null => {
    try {
      for (let i = 0; i < fnCoeffs.length; i++) {
        new Fraction(fnCoeffs[i]);
      }

      for (let i = 0; i < constraintsData.length; i++) {
        for (let j = 0; j < constraintsData[i].length; j++) {
          new Fraction(constraintsData[i][j]);
        }
      }

      const selectedBasis = basisSelection
        .map((selected, idx) => (selected ? idx : -1))
        .filter((idx) => idx !== -1);

      if (!useArtificialBasis && selectedBasis.length !== numConstraints) {
        return `Необходимо выбрать ${numConstraints} базисных переменных (выбрано ${selectedBasis.length})`;
      }

      return null;
    } catch (e) {
      return "Ошибка в формате чисел. Используйте целые числа или дроби (например: 1/2, 3, -2/5)";
    }
  };

  const buildLPTask = (): LPTask => {
    const fn = fnCoeffs.map((c) => new Fraction(c));
    const constraints = constraintsData.map((row) =>
      row.map((c) => new Fraction(c)),
    );

    let basis: number[];
    if (useArtificialBasis) {
      basis = Array.from(
        { length: numConstraints },
        (_, i) => numVariables + i,
      );
    } else {
      basis = basisSelection
        .map((selected, idx) => (selected ? idx : -1))
        .filter((idx) => idx !== -1);
    }

    return { fn, constraints, basis, isMaximization };
  };

  const handleSolve = () => {
    const validationError = validateInput();
    if (validationError) {
      setError(validationError);
      return;
    }
    const task = buildLPTask();
    if (isAutoMode) {
      solveAuto(task, useArtificialBasis);
    } else {
      startStepMode(task, useArtificialBasis);
    }
  };

  const handlePivotClick = (row: number, col: number) => {
    const task = buildLPTask();
    executeStepWithPivot(task, row, col);
  };

  const saveToFile = () => {
    try {
      const data = {
        numVariables,
        numConstraints,
        isMaximization,
        fnCoeffs: fnCoeffs,
        constraints: constraintsData,
        basis: basisSelection,
        useArtificialBasis,
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "simplex_task.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(`Ошибка сохранения: ${e.message}`);
    }
  };

  const loadFromFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        setNumVariables(data.numVariables);
        setNumConstraints(data.numConstraints);
        setIsMaximization(data.isMaximization);
        setFnCoeffs(data.fnCoeffs);
        setConstraintsData(data.constraints);
        setBasisSelection(data.basis);
        setUseArtificialBasis(data.useArtificialBasis || false);
        reset();
      } catch (e: any) {
        setError(`Ошибка загрузки: ${e.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <main className="container">
      <div className="topbar">
        <img src={TopBarImg} alt="" loading="lazy" />
      </div>

      <div style={{ width: "90%", marginTop: "1rem" }}>
        <details style={{ marginBottom: "1rem" }}>
          <summary
            style={{
              cursor: "pointer",
              fontSize: "1.1rem",
              fontWeight: "bold",
            }}
          >
            📖 Справка
          </summary>
          <div
            style={{
              marginTop: "0.5rem",
              textAlign: "left",
              padding: "1rem",
              backgroundColor: "rgba(29, 29, 29, 0.8)",
              borderRadius: "8px",
            }}
          >
            <h3>Как использовать программу:</h3>
            <ul>
              <li>
                <b>Ввод чисел:</b> Используйте целые числа (1, -2) или дроби
                (1/2, -3/4)
              </li>
              <li>
                <b>Базис:</b> Выберите базисные переменные (количество должно
                совпадать с количеством ограничений)
              </li>
              <li>
                <b>Автоматический режим:</b> Решение находится сразу целиком
              </li>
              <li>
                <b>Пошаговый режим:</b> Вы можете выбирать опорный элемент и
                переходить между шагами
              </li>
              <li>
                <b>Искусственный базис:</b> Используется, когда начальный
                допустимый базис неизвестен
              </li>
              <li>
                <b>Сохранение/Загрузка:</b> Задачу можно сохранить в файл и
                загрузить позже
              </li>
            </ul>
            <h3>Формат задачи (канонический):</h3>
            <p>f(x) = c₁x₁ + c₂x₂ + ... + cₙxₙ → min/max</p>
            <p>При ограничениях: a₁₁x₁ + a₁₂x₂ + ... + a₁ₙxₙ = b₁</p>
            <p style={{ marginLeft: "6.5rem" }}>
              a₂₁x₁ + a₂₂x₂ + ... + a₂ₙxₙ = b₂
            </p>
            <p style={{ marginLeft: "6.5rem" }}>...</p>
            <p style={{ marginLeft: "6.5rem" }}>xᵢ ≥ 0</p>
          </div>
        </details>

        <div className="size-input">
          <label htmlFor="num-variables">Переменных:</label>
          <input
            type="number"
            id="num-variables"
            min="2"
            max="16"
            value={numVariables}
            onChange={(e) =>
              setNumVariables(Math.max(2, Math.min(16, +e.target.value)))
            }
          />

          <label htmlFor="num-constraints">Ограничений:</label>
          <input
            type="number"
            id="num-constraints"
            min="2"
            max="16"
            value={numConstraints}
            onChange={(e) =>
              setNumConstraints(Math.max(2, Math.min(16, +e.target.value)))
            }
          />
        </div>

        <div
          style={{
            marginTop: "1rem",
            padding: "1rem",
            backgroundColor: "rgba(29, 29, 29, 0.8)",
            borderRadius: "8px",
          }}
        >
          <h3>Целевая функция:</h3>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <span>f(x) = </span>
            {Array.from({ length: numVariables }, (_, i) => (
              <span
                key={i}
                style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}
              >
                {i > 0 && <span>+</span>}
                <input
                  type="text"
                  style={{ width: "4rem" }}
                  value={fnCoeffs[i] || "1"}
                  onChange={(e) => {
                    const newCoeffs = [...fnCoeffs];
                    newCoeffs[i] = e.target.value;
                    setFnCoeffs(newCoeffs);
                  }}
                />
                <span>
                  x<sub>{i + 1}</sub>
                </span>
              </span>
            ))}
            <span>→</span>
            <select
              value={isMaximization ? "max" : "min"}
              onChange={(e) => setIsMaximization(e.target.value === "max")}
              style={{ padding: "0.3rem", borderRadius: "4px" }}
            >
              <option value="min">min</option>
              <option value="max">max</option>
            </select>
          </div>
        </div>

        <div
          style={{
            marginTop: "1rem",
            padding: "1rem",
            backgroundColor: "rgba(29, 29, 29, 0.8)",
            borderRadius: "8px",
          }}
        >
          <h3>Ограничения:</h3>
          {Array.from({ length: numConstraints }, (_, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.5rem",
                marginBottom: "0.5rem",
              }}
            >
              {Array.from({ length: numVariables }, (_, j) => (
                <span
                  key={j}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                  }}
                >
                  {j > 0 && <span>+</span>}
                  <input
                    type="text"
                    style={{ width: "4rem" }}
                    value={constraintsData[i]?.[j] || "1"}
                    onChange={(e) => {
                      const newConstraints = [...constraintsData];
                      if (!newConstraints[i]) {
                        newConstraints[i] = Array(numVariables + 1).fill("1");
                      }
                      newConstraints[i][j] = e.target.value;
                      setConstraintsData(newConstraints);
                    }}
                  />
                  <span>
                    x<sub>{j + 1}</sub>
                  </span>
                </span>
              ))}
              <span>=</span>
              <input
                type="text"
                style={{ width: "4rem" }}
                value={constraintsData[i]?.[numVariables] || "1"}
                onChange={(e) => {
                  const newConstraints = [...constraintsData];
                  if (!newConstraints[i]) {
                    newConstraints[i] = Array(numVariables + 1).fill("1");
                  }
                  newConstraints[i][numVariables] = e.target.value;
                  setConstraintsData(newConstraints);
                }}
              />
            </div>
          ))}
        </div>

        <div style={{ marginTop: "1rem" }}>
          <label
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <input
              type="checkbox"
              checked={useArtificialBasis}
              onChange={(e) => setUseArtificialBasis(e.target.checked)}
            />
            <span>Использовать метод искусственного базиса</span>
          </label>
        </div>

        {!useArtificialBasis && (
          <div
            style={{
              marginTop: "1rem",
              padding: "1rem",
              backgroundColor: "rgba(29, 29, 29, 0.8)",
              borderRadius: "8px",
            }}
          >
            <h3>Выбор базисных переменных:</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
              {Array.from({ length: numVariables }, (_, i) => (
                <label
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={basisSelection[i] || false}
                    onChange={(e) => {
                      const newBasis = [...basisSelection];
                      newBasis[i] = e.target.checked;
                      setBasisSelection(newBasis);
                    }}
                  />
                  <span>
                    x<sub>{i + 1}</sub>
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div
          style={{
            marginTop: "1rem",
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => setIsAutoMode(true)}
            style={{
              backgroundColor: isAutoMode
                ? "rgba(100, 150, 255, 0.3)"
                : undefined,
            }}
          >
            Автоматический режим
          </button>
          <button
            onClick={() => setIsAutoMode(false)}
            style={{
              backgroundColor: !isAutoMode
                ? "rgba(100, 150, 255, 0.3)"
                : undefined,
            }}
          >
            Пошаговый режим
          </button>
          <button onClick={saveToFile}>Сохранить в файл</button>
          <label
            style={{
              cursor: "pointer",
              padding: "0.3em 0.4em",
              backgroundColor: "#0f0f0f98",
              borderRadius: "8px",
              border: "1px solid transparent",
            }}
          >
            Загрузить из файла
            <input
              type="file"
              accept=".json"
              style={{ display: "none" }}
              onChange={loadFromFile}
            />
          </label>
        </div>

        {error && (
          <div
            style={{
              marginTop: "1rem",
              padding: "1rem",
              backgroundColor: "rgba(200, 50, 50, 0.3)",
              borderRadius: "8px",
              border: "1px solid rgba(255, 100, 100, 0.5)",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginTop: "1rem" }}>
          {steps.length === 0 ? (
            <button
              onClick={handleSolve}
              style={{ fontSize: "1.2rem", padding: "0.6rem 1.2rem" }}
            >
              {isAutoMode ? "Решить автоматически" : "Начать пошаговое решение"}
            </button>
          ) : (
            <button
              onClick={reset}
              style={{ fontSize: "1.2rem", padding: "0.6rem 1.2rem" }}
            >
              Новая задача
            </button>
          )}
        </div>

        {currentStep && (
          <div
            style={{
              marginTop: "2rem",
              padding: "1rem",
              backgroundColor: "rgba(29, 29, 29, 0.8)",
              borderRadius: "8px",
            }}
          >
            <h2>
              {currentStep.isComplete
                ? "Результат"
                : `Шаг ${currentStep.stepNumber}`}
            </h2>

            {currentStep.message && (
              <div
                style={{
                  whiteSpace: "pre-line",
                  marginTop: "1rem",
                  padding: "1rem",
                  backgroundColor: "rgba(100, 200, 100, 0.2)",
                  borderRadius: "8px",
                }}
              >
                {currentStep.message}
              </div>
            )}

            {currentStep.table.length > 0 && (
              <SimplexTable
                table={currentStep.table}
                basis={currentStep.basis}
                possiblePivots={currentStep.possiblePivots}
                selectedPivot={currentStep.selectedPivot}
                isComplete={currentStep.isComplete}
                onPivotClick={handlePivotClick}
              />
            )}

            {!isAutoMode && steps.length > 1 && (
              <div
                style={{
                  marginTop: "1rem",
                  display: "flex",
                  gap: "1rem",
                  justifyContent: "center",
                }}
              >
                <button
                  onClick={goToPreviousStep}
                  disabled={currentStepIndex === 0}
                >
                  ← Предыдущий шаг
                </button>
                <span style={{ alignSelf: "center" }}>
                  Шаг {currentStepIndex + 1} из {steps.length}
                </span>
                <button
                  onClick={goToNextStep}
                  disabled={currentStepIndex === steps.length - 1}
                >
                  Следующий шаг →
                </button>
              </div>
            )}
          </div>
        )}

        {steps.length > 0 && isAutoMode && (
          <div
            style={{
              marginTop: "1rem",
              padding: "1rem",
              backgroundColor: "rgba(29, 29, 29, 0.8)",
              borderRadius: "8px",
            }}
          >
            <h3>История решения ({steps.length} шагов):</h3>
            {steps.map((step, idx) => (
              <details key={idx} style={{ marginTop: "0.5rem" }}>
                <summary style={{ cursor: "pointer" }}>
                  {step.isComplete
                    ? `Финальный результат`
                    : `Шаг ${step.stepNumber}`}
                </summary>
                <div style={{ marginTop: "0.5rem" }}>
                  {step.message && (
                    <div
                      style={{
                        whiteSpace: "pre-line",
                        marginBottom: "0.5rem",
                        padding: "0.5rem",
                        backgroundColor: "rgba(100, 200, 100, 0.2)",
                        borderRadius: "8px",
                      }}
                    >
                      {step.message}
                    </div>
                  )}
                  {step.table.length > 0 && (
                    <SimplexTable
                      table={step.table}
                      basis={step.basis}
                      possiblePivots={step.possiblePivots}
                      selectedPivot={step.selectedPivot}
                      isComplete={step.isComplete}
                    />
                  )}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default App;
