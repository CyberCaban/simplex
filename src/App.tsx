import { useState, useEffect } from "react";
import "./App.css";
import TopBarImg from "./assets/topbar_2.webp";
import Fraction from "fraction.js";
import { LPTask } from "./simplex/types";
import { SimplexTable } from "./components/SimplexTable";
import { useSimplexSolver } from "./components/useSimplexSolver";
import LP from "./simplex/lp.json";
import { parseTask, Task } from "./simplex/types";

function App() {
  const [isMaximization, setIsMaximization] = useState(false);
  const [useArtificialBasis, setUseArtificialBasis] = useState(false);
  const [numVariables, setNumVariables] = useState(2);
  const [numConstraints, setNumConstraints] = useState(2);
  const [isAutoMode, setIsAutoMode] = useState(true);

  const [fnCoeffs, setFnCoeffs] = useState<string[]>([]);
  const [constraintsData, setConstraintsData] = useState<string[][]>([]);
  const [basisSelection, setBasisSelection] = useState<boolean[]>([]);

  const [isLoadingFromFile, setisLoadingFromFile] = useState(false);

  const [filename, setFilename] = useState("simplex-task");

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
    if (isLoadingFromFile) return;

    setFnCoeffs((prev) => {
      const next = [...prev];
      if (next.length > numVariables) {
        return next.slice(0, numVariables);
      }
      if (next.length < numVariables) {
        return next.concat(Array(numVariables - next.length).fill("1"));
      }
      return next;
    });
    setConstraintsData((prev) => {
      let rows = [...prev];
      if (rows.length > numConstraints) {
        rows = rows.slice(0, numConstraints);
      } else if (rows.length < numConstraints) {
        const addRows = Array.from(
          { length: numConstraints - rows.length },
          () => Array(numVariables + 1).fill("1")
        );
        rows = rows.concat(addRows);
      }
      rows = rows.map((row) => {
        let r = row ? [...row] : [];
        if (r.length > numVariables + 1) {
          r = r.slice(0, numVariables + 1);
        } else if (r.length < numVariables + 1) {
          r = r.concat(Array(numVariables + 1 - r.length).fill("1"));
        }
        return r;
      });

      return rows;
    });
    setBasisSelection((prev) => {
      const next = [...prev];
      if (next.length > numVariables) {
        return next.slice(0, numVariables);
      }
      if (next.length < numVariables) {
        return next.concat(Array(numVariables - next.length).fill(false));
      }
      return next;
    });
    // const newFn = Array(numVariables).fill("1");
    // const newConstraints = Array(numConstraints)
    //   .fill(null)
    //   .map(() => Array(numVariables + 1).fill("1"));
    // const newBasis = Array(numVariables).fill(false);

    // setFnCoeffs(newFn);
    // setConstraintsData(newConstraints);
    // setBasisSelection(newBasis);
    reset();
  }, [numVariables, numConstraints, isAutoMode]);

  const validateInput = (): string | null => {
    try {
      for (let i = 0; i < numVariables; i++) {
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
      row.map((c) => new Fraction(c))
    );

    let basis: number[];
    if (useArtificialBasis) {
      basis = Array.from({ length: numConstraints }, (_, i) => i);
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
    debugger;
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
      a.download = `${filename}.json`;
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
        setisLoadingFromFile(true);
        setNumVariables(data.numVariables);
        setNumConstraints(data.numConstraints);
        setIsMaximization(data.isMaximization);
        setFnCoeffs(data.fnCoeffs);
        setConstraintsData(data.constraints);
        setBasisSelection(data.basis);
        setUseArtificialBasis(data.useArtificialBasis || false);
        reset();
        setisLoadingFromFile(false);
      } catch (e: any) {
        setError(`Ошибка загрузки: ${e.message}`);
      }
    };
    reader.readAsText(file);
  };

  const loadExample = (exampleIndex: number) => {
    try {
      const tasks: Task[] = LP as Task[];
      if (exampleIndex < 0 || exampleIndex >= tasks.length) {
        setError("Неверный номер примера");
        return;
      }

      const task = parseTask(tasks[exampleIndex]);
      setNumVariables(task.fn.length);
      setNumConstraints(task.constraints.length);
      setIsMaximization(task.isMaximization);
      setFnCoeffs(task.fn.map((f) => f.toFraction()));
      setConstraintsData(
        task.constraints.map((row) => row.map((c) => c.toFraction()))
      );

      const newBasisSelection = Array(task.fn.length).fill(false);
      if (
        task.basis.length > 0 &&
        task.basis.length === task.constraints.length
      ) {
        task.basis.forEach((idx) => {
          if (idx < task.fn.length) {
            newBasisSelection[idx] = true;
          }
        });
        setBasisSelection(newBasisSelection);
        setUseArtificialBasis(false);
      } else {
        setBasisSelection(newBasisSelection);
        setUseArtificialBasis(true);
      }

      reset();
    } catch (e: any) {
      setError(`Ошибка загрузки примера: ${e.message}`);
    }
  };

  return (
    <main className="container">
      <div className="topbar">
        <img src={TopBarImg} alt="" loading="lazy" />
      </div>

      <div
        style={{
          width: "90%",
          marginTop: "1rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
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
            display: "flex",
            flexDirection: "column",
            width: "90%",
          }}
        >
          <h3>Целевая функция:</h3>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              alignSelf: "center",
              flexWrap: "wrap",
              gap: "0.5rem",
              width: "90%",
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
                  style={{ width: "4rem", textAlign: "end" }}
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
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "90%",
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
                    style={{ width: "4rem", textAlign: "end" }}
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
              width: "90%",
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
            padding: "1rem",
            backgroundColor: "rgba(29, 29, 29, 0.8)",
            borderRadius: "8px",
            width: "90%",
          }}
        >
          <h3>Примеры задач из библиотеки:</h3>
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              flexWrap: "wrap",
              marginTop: "0.5rem",
            }}
          >
            {LP.map((example, idx) => (
              <button
                key={idx}
                onClick={() => loadExample(idx)}
                style={{
                  padding: "0.5rem 1rem",
                  fontSize: "0.9rem",
                }}
                title={(example as any).comment || `Пример ${idx + 1}`}
              >
                Пример {idx + 1}
              </button>
            ))}
          </div>
          <div
            style={{ fontSize: "0.85rem", marginTop: "0.5rem", opacity: 0.7 }}
          >
            Примеры из учебных задач с разными типами решений
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: "1rem"
            }}
          >
            <button onClick={saveToFile}>Сохранить в файл</button>
            <input
              onChange={(e) => setFilename(e.target.value)}
              value={filename}
            />
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
          <div
            style={{ fontSize: "0.85rem", marginTop: "0.5rem", opacity: 0.7 }}
          >
            Сохранение и загрузка задач
          </div>
        </div>

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

            {currentStep.basis.length > 0 && (
              <div
                style={{
                  marginTop: "0.5rem",
                  padding: "0.5rem",
                  backgroundColor: "rgba(50, 50, 50, 0.3)",
                  borderRadius: "4px",
                  fontSize: "0.9rem",
                }}
              >
                <strong>Текущий базис:</strong>{" "}
                {currentStep.basis.map((b) => `x${b + 1}`).join(", ")}
              </div>
            )}

            {currentStep.message && (
              <div
                style={{
                  whiteSpace: "pre-line",
                  marginTop: "1rem",
                  padding: "1rem",
                  backgroundColor: currentStep.isComplete
                    ? currentStep.message.includes("не имеет") ||
                      currentStep.message.includes("не ограничена") ||
                      currentStep.message.includes("Ошибка")
                      ? "rgba(200, 100, 100, 0.3)"
                      : "rgba(100, 200, 100, 0.2)"
                    : "rgba(100, 150, 255, 0.2)",
                  borderRadius: "8px",
                  border: currentStep.isComplete
                    ? currentStep.message.includes("не имеет") ||
                      currentStep.message.includes("не ограничена") ||
                      currentStep.message.includes("Ошибка")
                      ? "1px solid rgba(255, 100, 100, 0.5)"
                      : "1px solid rgba(100, 255, 100, 0.3)"
                    : "1px solid rgba(100, 150, 255, 0.3)",
                }}
              >
                {currentStep.message}
              </div>
            )}

            {currentStep.table.length > 0 && (
              <SimplexTable
                isAutoMode={isAutoMode}
                table={currentStep.table}
                basis={currentStep.basis}
                possiblePivots={currentStep.possiblePivots}
                selectedPivot={currentStep.selectedPivot}
                isComplete={currentStep.isComplete}
                onPivotClick={handlePivotClick}
              />
            )}

            {steps.length > 1 && (
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

        {steps.length > 0 && (
          <details
            style={{
              marginTop: "1rem",
              padding: "1rem",
              backgroundColor: "rgba(29, 29, 29, 0.8)",
              borderRadius: "8px",
            }}
          >
            <summary>Все шаги решения ({steps.length}):</summary>
            <div
              style={{ fontSize: "0.9rem", marginBottom: "1rem", opacity: 0.8 }}
            >
              {isAutoMode
                ? "Решение в автоматическом режиме. Используйте кнопки навигации выше для просмотра шагов или раскройте детали ниже."
                : "Решение в пошаговом режиме. Используйте кнопки навигации выше для перехода между шагами."}
              <br />
              💡{" "}
              <i>
                Совет: Кликните "Перейти к этому шагу" чтобы просмотреть таблицу
                выше
              </i>
            </div>
            {steps.map((step, idx) => (
              <details
                key={idx}
                style={{ marginTop: "0.5rem" }}
                open={idx === currentStepIndex}
              >
                <summary
                  style={{
                    cursor: "pointer",
                    padding: "0.5rem",
                    backgroundColor:
                      idx === currentStepIndex
                        ? "rgba(100, 150, 255, 0.2)"
                        : undefined,
                    borderRadius: "4px",
                  }}
                >
                  {step.isComplete
                    ? step.message?.includes("не имеет") ||
                      step.message?.includes("не ограничена") ||
                      step.message?.includes("Ошибка")
                      ? "❌ " + (step.message?.split("\n")[0] || "Ошибка")
                      : "✅ Финальный результат"
                    : step.stepNumber === 0
                    ? "🔵 Начальная таблица"
                    : `📊 Шаг ${step.stepNumber}`}
                  {idx === currentStepIndex && " (текущий)"}
                </summary>
                <div style={{ marginTop: "0.5rem", paddingLeft: "1rem" }}>
                  {step.message && (
                    <div
                      style={{
                        whiteSpace: "pre-line",
                        marginBottom: "0.5rem",
                        padding: "0.5rem",
                        backgroundColor: step.isComplete
                          ? step.message.includes("не имеет") ||
                            step.message.includes("не ограничена") ||
                            step.message.includes("Ошибка")
                            ? "rgba(200, 100, 100, 0.2)"
                            : "rgba(100, 200, 100, 0.2)"
                          : "rgba(100, 150, 255, 0.1)",
                        borderRadius: "8px",
                      }}
                    >
                      {step.message}
                    </div>
                  )}
                  {step.table.length > 0 && (
                    <SimplexTable
                      isAutoMode={isAutoMode}
                      table={step.table}
                      basis={step.basis}
                      possiblePivots={step.possiblePivots}
                      selectedPivot={step.selectedPivot}
                      isComplete={step.isComplete}
                    />
                  )}
                  {step.basis.length > 0 && (
                    <div
                      style={{
                        marginTop: "0.5rem",
                        fontSize: "0.85rem",
                        opacity: 0.7,
                      }}
                    >
                      Базис: {step.basis.map((b) => `x${b + 1}`).join(", ")}
                    </div>
                  )}
                  {step.selectedPivot && (
                    <div
                      style={{
                        marginTop: "0.5rem",
                        fontSize: "0.85rem",
                        opacity: 0.7,
                      }}
                    >
                      Опорный элемент: строка {step.selectedPivot.row + 1},
                      столбец x{step.selectedPivot.col + 1}
                    </div>
                  )}
                </div>
              </details>
            ))}
          </details>
        )}
      </div>
    </main>
  );
}

export default App;
