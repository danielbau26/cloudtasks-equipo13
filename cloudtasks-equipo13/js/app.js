// Referencias a los elementos del DOM
const taskForm = document.getElementById("task-form");
const taskList = document.getElementById("task-list");

const titleInput = document.getElementById("title");
const descriptionInput = document.getElementById("description");
const priorityInput = document.getElementById("priority");
const deadlineInput = document.getElementById("deadline");

// Cargar tareas al iniciar la aplicación
document.addEventListener("DOMContentLoaded", fetchTasks);

// Leer tareas desde Supabase
async function fetchTasks() {
    try {
        const { data, error } = await supabaseClient
            .from("tasks")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        const connectionError = document.getElementById("connection-error");
        if (connectionError) connectionError.hidden = true;

        renderTasks(data);
    } catch (error) {
        console.error("Error al consultar las tareas:", error.message);
        const connectionError = document.getElementById("connection-error");
        if (connectionError) connectionError.hidden = false;
    }
}

// Crear una nueva tarea
taskForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    const priority = priorityInput.value;
    const deadline = deadlineInput.value;

    if (!title || !description || !priority || !deadline) {
        alert("Por favor, completa todos los campos.");
        return;
    }

    const newTask = {
        title: title,
        description: description,
        priority: priority,
        deadline: deadline,
        completed: false
    };

    try {
        const { error } = await supabaseClient
            .from("tasks")
            .insert([newTask]);

        if (error) throw error;

        taskForm.reset();
        await fetchTasks();
    } catch (error) {
        console.error("Error al crear la tarea:", error.message);
        alert("Ocurrió un error al guardar la tarea en la base de datos.");
    }
});

// Renderizar tareas en el DOM
function renderTasks(tasks) {
    taskList.innerHTML = "";

    if (!tasks || tasks.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.classList.add("empty-message");
        emptyMessage.textContent = "No hay tareas registradas.";
        taskList.appendChild(emptyMessage);
        return;
    }

    tasks.forEach(function (task) {
        const taskCard = document.createElement("article");
        taskCard.classList.add("task-card", `priority-${task.priority}`);

        if (task.completed) {
            taskCard.classList.add("completed");
        }

        const taskTitle = document.createElement("h3");
        taskTitle.textContent = task.title;

        const taskDescription = document.createElement("p");
        taskDescription.textContent = task.description;

        const taskPriority = document.createElement("p");
        taskPriority.textContent = `Prioridad: ${task.priority}`;

        const taskDeadline = document.createElement("p");
        taskDeadline.textContent = `Fecha límite: ${formatDate(task.deadline)}`;

        const taskStatus = document.createElement("p");
        taskStatus.textContent = task.completed ? "Estado: Completada" : "Estado: Pendiente";

        const taskCreatedAt = document.createElement("p");
        const formattedDate = new Date(task.created_at).toLocaleString();
        taskCreatedAt.textContent = `Creada: ${formattedDate}`;

        const buttonContainer = document.createElement("div");
        buttonContainer.classList.add("task-actions");

        const completeButton = document.createElement("button");
        completeButton.classList.add("complete-button");
        completeButton.textContent = task.completed ? "Marcar como pendiente" : "Completar";
        completeButton.addEventListener("click", function () {
            toggleTaskStatus(task.id, task.completed);
        });

        const deleteButton = document.createElement("button");
        deleteButton.classList.add("delete-button");
        deleteButton.textContent = "Eliminar";
        deleteButton.addEventListener("click", function () {
            deleteTask(task.id);
        });

        buttonContainer.appendChild(completeButton);
        buttonContainer.appendChild(deleteButton);

        taskCard.appendChild(taskTitle);
        taskCard.appendChild(taskDescription);
        taskCard.appendChild(taskPriority);
        taskCard.appendChild(taskDeadline);
        taskCard.appendChild(taskStatus);
        taskCard.appendChild(taskCreatedAt);
        taskCard.appendChild(buttonContainer);

        taskList.appendChild(taskCard);
    });
}

// Actualizar estado de tarea en Supabase
async function toggleTaskStatus(taskId, currentStatus) {
    try {
        const { error } = await supabaseClient
            .from("tasks")
            .update({ completed: !currentStatus })
            .eq("id", taskId);

        if (error) throw error;

        await fetchTasks();
    } catch (error) {
        console.error("Error al actualizar la tarea:", error.message);
        alert("Ocurrió un error al actualizar el estado de la tarea.");
    }
}

// Eliminar tarea en Supabase
async function deleteTask(taskId) {
    const confirmation = confirm("¿Estás seguro de que deseas eliminar esta tarea?");
    if (!confirmation) return;

    try {
        const { error } = await supabaseClient
            .from("tasks")
            .delete()
            .eq("id", taskId);

        if (error) throw error;

        await fetchTasks();
    } catch (error) {
        console.error("Error al eliminar la tarea:", error.message);
        alert("Ocurrió un error al eliminar la tarea.");
    }
}

// Convertir fecha YYYY-MM-DD a DD/MM/YYYY
function formatDate(dateString) {
    if (!dateString) return "";
    const dateParts = dateString.split("-");
    if (dateParts.length < 3) return dateString;
    return `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
}