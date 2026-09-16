// Lógica pura de tareas, separada del DOM para poder testearla de forma aislada.

// Convertir fecha YYYY-MM-DD a DD/MM/YYYY
export function formatDate(dateString) {
    if (!dateString) return "";
    const dateParts = dateString.split("-");
    if (dateParts.length < 3) return dateString;
    return `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
}

// Rango numérico de una prioridad para poder ordenar (mayor = más urgente)
export function getPriorityRank(priority) {
    return priority === 'alta' ? 3 : priority === 'media' ? 2 : 1;
}

// Devuelve una copia ordenada del arreglo de tareas según sortKey ('priority' | 'deadline' | null)
export function sortTasks(tasks, sortKey) {
    const sorted = [...(tasks || [])];

    if (sortKey === 'priority') {
        sorted.sort((a, b) => getPriorityRank(b.priority) - getPriorityRank(a.priority));
    } else if (sortKey === 'deadline') {
        sorted.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    }

    return sorted;
}

// Calcula el resumen de progreso (total, completadas, porcentaje y nivel visual)
export function computeProgress(tasks) {
    const total = (tasks || []).length;
    const completed = (tasks || []).filter(task => task.completed).length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    const level = percentage < 50 ? 'low' : percentage < 80 ? 'medium' : 'high';

    return { total, completed, percentage, level };
}

// Valida los campos del formulario de nueva tarea
export function validateTaskForm({ title, description, priority, deadline }) {
    if (!title || !description || !priority || !deadline) {
        return { valid: false, message: "Por favor, completa todos los campos." };
    }
    return { valid: true, message: null };
}
