// Obtener los elementos del HTML
const taskForm = document.getElementById("task-form");
const taskList = document.getElementById("task-list");

const titleInput = document.getElementById("title");
const descriptionInput = document.getElementById("description");
const priorityInput = document.getElementById("priority");
const deadlineInput = document.getElementById("deadline");

// Arreglo donde se guardan temporalmente las tareas
const tasks = [];

// Registrar una nueva tarea
taskForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    const priority = priorityInput.value;
    const deadline = deadlineInput.value;

    // Validar los campos
    if (
        title === "" ||
        description === "" ||
        priority === "" ||
        deadline === ""
    ) {
        alert("Por favor, completa todos los campos.");
        return;
    }

    // Crear el objeto de la nueva tarea
    const newTask = {
        id: Date.now(),
        title: title,
        description: description,
        priority: priority,
        deadline: deadline,
        completed: false,
        createdAt: new Date().toLocaleString()
    };

    // Agregar la tarea al arreglo
    tasks.push(newTask);

    // Actualizar la lista
    renderTasks();

    // Limpiar el formulario
    taskForm.reset();
});

// Mostrar las tareas registradas
function renderTasks() {
    taskList.innerHTML = "";

    // Mostrar mensaje si no existen tareas
    if (tasks.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.classList.add("empty-message");
        emptyMessage.textContent = "No hay tareas registradas.";

        taskList.appendChild(emptyMessage);
        return;
    }

    tasks.forEach(function (task) {
        // Crear tarjeta
        const taskCard = document.createElement("article");

        taskCard.classList.add(
            "task-card",
            `priority-${task.priority}`
        );

        // Aplicar estilo si está completada
        if (task.completed) {
            taskCard.classList.add("completed");
        }

        // Título
        const taskTitle = document.createElement("h3");
        taskTitle.textContent = task.title;

        // Descripción
        const taskDescription = document.createElement("p");
        taskDescription.textContent = task.description;

        // Prioridad
        const taskPriority = document.createElement("p");
        taskPriority.textContent = `Prioridad: ${task.priority}`;

        // Fecha límite
        const taskDeadline = document.createElement("p");
        taskDeadline.textContent =
            `Fecha límite: ${formatDate(task.deadline)}`;

        // Estado
        const taskStatus = document.createElement("p");

        if (task.completed) {
            taskStatus.textContent = "Estado: Completada";
        } else {
            taskStatus.textContent = "Estado: Pendiente";
        }

        // Fecha de creación
        const taskCreatedAt = document.createElement("p");
        taskCreatedAt.textContent = `Creada: ${task.createdAt}`;

        // Contenedor para los botones
        const buttonContainer = document.createElement("div");
        buttonContainer.classList.add("task-actions");

        // Botón para cambiar el estado
        const completeButton = document.createElement("button");
        completeButton.classList.add("complete-button");

        if (task.completed) {
            completeButton.textContent = "Marcar como pendiente";
        } else {
            completeButton.textContent = "Completar";
        }

        completeButton.addEventListener("click", function () {
            toggleTaskStatus(task.id);
        });

        // Botón para eliminar
        const deleteButton = document.createElement("button");
        deleteButton.classList.add("delete-button");
        deleteButton.textContent = "Eliminar";

        deleteButton.addEventListener("click", function () {
            deleteTask(task.id);
        });

        // Agregar botones al contenedor
        buttonContainer.appendChild(completeButton);
        buttonContainer.appendChild(deleteButton);

        // Agregar la información a la tarjeta
        taskCard.appendChild(taskTitle);
        taskCard.appendChild(taskDescription);
        taskCard.appendChild(taskPriority);
        taskCard.appendChild(taskDeadline);
        taskCard.appendChild(taskStatus);
        taskCard.appendChild(taskCreatedAt);
        taskCard.appendChild(buttonContainer);

        // Agregar la tarjeta a la lista
        taskList.appendChild(taskCard);
    });
}

// Cambiar el estado de una tarea
function toggleTaskStatus(taskId) {
    const task = tasks.find(function (task) {
        return task.id === taskId;
    });

    if (task) {
        task.completed = !task.completed;
        renderTasks();
    }
}

// Eliminar una tarea
function deleteTask(taskId) {
    const taskPosition = tasks.findIndex(function (task) {
        return task.id === taskId;
    });

    if (taskPosition === -1) {
        return;
    }

    const confirmation = confirm(
        "¿Estás seguro de que deseas eliminar esta tarea?"
    );

    if (confirmation) {
        tasks.splice(taskPosition, 1);
        renderTasks();
    }
}

// Convertir la fecha al formato día/mes/año
function formatDate(date) {
    const dateParts = date.split("-");

    return `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
}

// Mostrar el mensaje inicial
renderTasks();