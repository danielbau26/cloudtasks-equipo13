import { describe, it, expect } from "vitest";
import {
    formatDate,
    getPriorityRank,
    sortTasks,
    computeProgress,
    validateTaskForm
} from "../../js/taskUtils.js";

describe("formatDate", () => {
    it("convierte YYYY-MM-DD a DD/MM/YYYY", () => {
        expect(formatDate("2026-09-14")).toBe("14/09/2026");
    });

    it("devuelve cadena vacía si no hay fecha", () => {
        expect(formatDate("")).toBe("");
        expect(formatDate(undefined)).toBe("");
        expect(formatDate(null)).toBe("");
    });

    it("devuelve el valor original si el formato no tiene al menos 3 partes separadas por '-'", () => {
        expect(formatDate("2026-09")).toBe("2026-09");
        expect(formatDate("sinformato")).toBe("sinformato");
    });
});

describe("getPriorityRank", () => {
    it("ordena alta > media > baja", () => {
        expect(getPriorityRank("alta")).toBe(3);
        expect(getPriorityRank("media")).toBe(2);
        expect(getPriorityRank("baja")).toBe(1);
    });

    it("trata valores desconocidos como baja prioridad", () => {
        expect(getPriorityRank("otra-cosa")).toBe(1);
        expect(getPriorityRank(undefined)).toBe(1);
    });
});

describe("sortTasks", () => {
    const tasks = [
        { id: 1, priority: "baja", deadline: "2026-12-01" },
        { id: 2, priority: "alta", deadline: "2026-09-01" },
        { id: 3, priority: "media", deadline: "2026-10-15" }
    ];

    it("ordena por prioridad de mayor a menor", () => {
        const sorted = sortTasks(tasks, "priority");
        expect(sorted.map(t => t.id)).toEqual([2, 3, 1]);
    });

    it("ordena por fecha límite ascendente", () => {
        const sorted = sortTasks(tasks, "deadline");
        expect(sorted.map(t => t.id)).toEqual([2, 3, 1]);
    });

    it("no reordena cuando no hay criterio de orden", () => {
        const sorted = sortTasks(tasks, null);
        expect(sorted.map(t => t.id)).toEqual([1, 2, 3]);
    });

    it("no muta el arreglo original", () => {
        const original = [...tasks];
        sortTasks(tasks, "priority");
        expect(tasks).toEqual(original);
    });

    it("maneja arreglos vacíos o indefinidos", () => {
        expect(sortTasks([], "priority")).toEqual([]);
        expect(sortTasks(undefined, "priority")).toEqual([]);
    });
});

describe("computeProgress", () => {
    it("devuelve 0% cuando no hay tareas", () => {
        expect(computeProgress([])).toEqual({ total: 0, completed: 0, percentage: 0, level: "low" });
    });

    it("calcula el porcentaje y redondea correctamente", () => {
        const tasks = [
            { completed: true },
            { completed: true },
            { completed: false }
        ];
        const result = computeProgress(tasks);
        expect(result.total).toBe(3);
        expect(result.completed).toBe(2);
        expect(result.percentage).toBe(67); // 66.66... redondeado
    });

    it("asigna el nivel según el porcentaje (low/medium/high)", () => {
        expect(computeProgress([{ completed: false }, { completed: false }]).level).toBe("low");
        expect(computeProgress([
            { completed: true }, { completed: false }, { completed: false }
        ]).level).toBe("low"); // 33%

        const mediumTasks = [{ completed: true }, { completed: true }, { completed: false }];
        expect(computeProgress(mediumTasks).level).toBe("medium"); // 67%

        const highTasks = [
            { completed: true }, { completed: true }, { completed: true }, { completed: true }, { completed: false }
        ];
        expect(computeProgress(highTasks).level).toBe("high"); // 80%
    });

    it("maneja undefined como si fuera un arreglo vacío", () => {
        expect(computeProgress(undefined)).toEqual({ total: 0, completed: 0, percentage: 0, level: "low" });
    });
});

describe("validateTaskForm", () => {
    const validForm = { title: "Tarea", description: "Descripción", priority: "alta", deadline: "2026-09-20" };

    it("es válido cuando todos los campos están presentes", () => {
        expect(validateTaskForm(validForm)).toEqual({ valid: true, message: null });
    });

    it.each([
        ["title", ""],
        ["description", ""],
        ["priority", ""],
        ["deadline", ""]
    ])("es inválido si falta %s", (field) => {
        const form = { ...validForm, [field]: "" };
        const result = validateTaskForm(form);
        expect(result.valid).toBe(false);
        expect(result.message).toBe("Por favor, completa todos los campos.");
    });
});
