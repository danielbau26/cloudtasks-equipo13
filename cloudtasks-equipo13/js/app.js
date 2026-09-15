import { supabaseClient } from "./supabaseClient.js";
import { formatDate, sortTasks, computeProgress, validateTaskForm } from "./taskUtils.js";

// Referencias a los elementos del DOM
const taskForm = document.getElementById("task-form");
const toggleNewTask = document.getElementById("toggle-new-task");
const newTaskContainer = document.getElementById("new-task-container");

const pendingList = document.getElementById("pending-list");
const completedList = document.getElementById("completed-list");
const pendingCount = document.getElementById("pending-count");
const completedCount = document.getElementById("completed-count");
const sortPriorityBtn = document.getElementById("sort-priority");
const sortDeadlineBtn = document.getElementById("sort-deadline");

const pendingBtn = document.getElementById("pending-btn");
const completedBtn = document.getElementById("completed-btn");
const allBtn = document.getElementById("all-btn");

const pendingSection = document.getElementById("pending-section");
const completedSection = document.getElementById("completed-section");
const allProgress = document.getElementById("all-progress");
const progressPercent = document.getElementById("progress-percent");
const progressBarFill = document.getElementById("progress-bar-fill");

const titleInput = document.getElementById("title");
const descriptionInput = document.getElementById("description");
const priorityInput = document.getElementById("priority");
const deadlineInput = document.getElementById("deadline");

// Referencias del inicio de sesión
const authSection = document.getElementById("auth-section");
const appContent = document.getElementById("app-content");
const showLoginTab = document.getElementById("show-login-tab");
const showRegisterTab = document.getElementById("show-register-tab");
const loginForm = document.getElementById("login-form");
const loginUsername = document.getElementById("login-username");
const loginPassword = document.getElementById("login-password");
const registerForm = document.getElementById("register-form");
const registerUsername = document.getElementById("register-username");
const registerPassword = document.getElementById("register-password");
const authMessage = document.getElementById("auth-message");
const logoutButton = document.getElementById("logout-button");
const userUsername = document.getElementById("user-username");

// Supabase Auth requiere un correo, así que a cada nombre de usuario le
// asignamos un correo interno ficticio que el usuario nunca ve.
const USERNAME_EMAIL_DOMAIN = "cloudtasks.local";
const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]{3,30}$/;

function usernameToEmail(username) {
    return `${username.toLowerCase()}@${USERNAME_EMAIL_DOMAIN}`;
}

let tasksCache = [];
let currentSort = null; // 'priority' or 'deadline'
let currentUser = null;

// Toggle formulario nueva tarea
if (toggleNewTask) {
    toggleNewTask.addEventListener("click", function () {
        const isHidden = newTaskContainer.classList.toggle("hidden");
        const expanded = !isHidden;
        toggleNewTask.setAttribute("aria-expanded", expanded);
        if (expanded) titleInput.focus();
    });
}

if (sortPriorityBtn) {
    sortPriorityBtn.addEventListener("click", function () {
        currentSort = 'priority';
        renderTasks(tasksCache);
    });
}

if (sortDeadlineBtn) {
    sortDeadlineBtn.addEventListener("click", function () {
        currentSort = 'deadline';
        renderTasks(tasksCache);
    });
}

// Manejo de visibilidad: solo una sección abierta a la vez, o ambas si se pulsa 'Todas'
function showPendingOnly() {
    if (pendingSection) pendingSection.classList.remove('hidden');
    if (completedSection) completedSection.classList.add('hidden');
    if (allProgress) allProgress.classList.add('hidden');
    pendingBtn.classList.add('active');
    completedBtn.classList.remove('active');
    if (allBtn) allBtn.classList.remove('active');
}

function showCompletedOnly() {
    if (pendingSection) pendingSection.classList.add('hidden');
    if (completedSection) completedSection.classList.remove('hidden');
    if (allProgress) allProgress.classList.add('hidden');
    pendingBtn.classList.remove('active');
    completedBtn.classList.add('active');
    if (allBtn) allBtn.classList.remove('active');
}

function showAll() {
    if (pendingSection) pendingSection.classList.remove('hidden');
    if (completedSection) completedSection.classList.remove('hidden');
    if (allProgress) allProgress.classList.remove('hidden');
    pendingBtn.classList.remove('active');
    completedBtn.classList.remove('active');
    if (allBtn) allBtn.classList.add('active');
    updateProgressSummary(tasksCache);
}

if (pendingBtn) pendingBtn.addEventListener('click', showPendingOnly);
if (completedBtn) completedBtn.addEventListener('click', showCompletedOnly);
if (allBtn) allBtn.addEventListener('click', showAll);

// Inicializar estado: mostrar solo pendientes
showPendingOnly();

// Leer tareas desde Supabase
export async function fetchTasks() {
    try {
        const { data, error } = await supabaseClient
            .from("tasks")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        const connectionError = document.getElementById("connection-error");
        if (connectionError) connectionError.hidden = true;

        tasksCache = data || [];
        renderTasks(tasksCache);
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

    const validation = validateTaskForm({ title, description, priority, deadline });
    if (!validation.valid) {
        alert(validation.message);
        return;
    }

    const newTask = {
        title: title,
        description: description,
        priority: priority,
        deadline: deadline,
        completed: false,
        user_id: currentUser?.id
    };

    try {
        const { error } = await supabaseClient
            .from("tasks")
            .insert([newTask]);

        if (error) throw error;

        taskForm.reset();
        newTaskContainer.classList.add("hidden");
        toggleNewTask.setAttribute("aria-expanded", false);
        await fetchTasks();
    } catch (error) {
        console.error("Error al crear la tarea:", error.message);
        alert("Ocurrió un error al guardar la tarea en la base de datos.");
    }
});

function updateProgressSummary(tasks) {
    if (!allProgress || !progressPercent || !progressBarFill) return;

    const { total, completed, percentage, level } = computeProgress(tasks);

    progressPercent.textContent = `${percentage}%`;
    progressBarFill.style.width = `${percentage}%`;

    allProgress.classList.remove('low', 'medium', 'high');
    allProgress.classList.add(level);

    const totalText = total === 0 ? '0 tareas' : `${completed}/${total} completadas`;
    allProgress.setAttribute('title', `${totalText} · ${percentage}% completado`);
    allProgress.classList.toggle('hidden', !allBtn || !allBtn.classList.contains('active'));
}

// Renderizar tareas en el DOM
export function renderTasks(tasks) {
    // Separar pendientes y completadas, y aplicar ordenamiento si corresponde
    const pending = sortTasks((tasks || []).filter(t => !t.completed), currentSort);
    const completed = sortTasks((tasks || []).filter(t => t.completed), currentSort);

    // Contenedores
    pendingList.innerHTML = "";
    completedList.innerHTML = "";

    pendingCount.textContent = pending.length;
    completedCount.textContent = completed.length;
    updateProgressSummary(tasks);

    if (pending.length === 0) {
        const p = document.createElement('p');
        p.classList.add('empty-message');
        p.textContent = 'No hay tareas registradas.';
        pendingList.appendChild(p);
    }

    if (completed.length === 0) {
        const p = document.createElement('p');
        p.classList.add('empty-message');
        p.textContent = 'No hay tareas realizadas.';
        completedList.appendChild(p);
    }

    const renderItem = (task, container) => {
        const taskCard = document.createElement("article");
        taskCard.classList.add("task-card", `priority-${task.priority}`);
        if (task.completed) taskCard.classList.add("completed");

        const taskHeader = document.createElement("div");
        taskHeader.classList.add("task-card-header");

        const taskTitle = document.createElement("h3");
        taskTitle.textContent = task.title;
        taskHeader.appendChild(taskTitle);

        const taskDescription = document.createElement("p");
        const dot = document.createElement('span');
        dot.classList.add('priority-dot', `priority-${task.priority}`);
        taskDescription.appendChild(dot);
        const descText = document.createTextNode(task.description);
        taskDescription.appendChild(descText);

        const taskPriority = document.createElement("p");
        taskPriority.textContent = `Prioridad: ${task.priority}`;

        const taskDeadline = document.createElement("p");
        taskDeadline.classList.add('deadline');
        const clockSpan = document.createElement('span');
        clockSpan.classList.add('clock-icon');
        clockSpan.innerHTML = getClockSVG();
        taskDeadline.appendChild(clockSpan);
        const deadlineText = document.createTextNode(`Fecha límite: ${formatDate(task.deadline)}`);
        taskDeadline.appendChild(deadlineText);

        const taskStatus = document.createElement("p");
        taskStatus.textContent = task.completed ? "Estado: Completada" : "Estado: Pendiente";

        const taskCreatedAt = document.createElement("p");
        const formattedDate = task.created_at ? new Date(task.created_at).toLocaleString() : '';
        taskCreatedAt.textContent = `Creada: ${formattedDate}`;

        const buttonContainer = document.createElement("div");
        buttonContainer.classList.add("task-actions");

        const completeButton = document.createElement("button");
        completeButton.classList.add("complete-button");
        completeButton.innerHTML = `${getCheckIcon()}<span>${task.completed ? "Marcar como pendiente" : "Completar"}</span>`;
        completeButton.addEventListener("click", function () {
            toggleTaskStatus(task.id, task.completed);
        });

        const deleteButton = document.createElement("button");
        deleteButton.classList.add("delete-button");
        deleteButton.innerHTML = `${getTrashIcon()}<span>Eliminar</span>`;
        deleteButton.addEventListener("click", function () {
            deleteTask(task.id);
        });

        buttonContainer.appendChild(completeButton);
        buttonContainer.appendChild(deleteButton);

        taskCard.appendChild(taskHeader);
        taskCard.appendChild(taskDescription);
        taskCard.appendChild(taskPriority);
        taskCard.appendChild(taskDeadline);
        taskCard.appendChild(taskStatus);
        taskCard.appendChild(taskCreatedAt);
        taskCard.appendChild(buttonContainer);

        container.appendChild(taskCard);
    };

    pending.forEach(t => renderItem(t, pendingList));
    completed.forEach(t => renderItem(t, completedList));
}

// Pequeña función que devuelve SVG de reloj
function getClockSVG() {
        return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
        </svg>`;
}

function getCheckIcon() {
    return `
        <span class="action-icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 11.5l2.2 2.2L15 7.5"></path>
                <rect x="3.5" y="3.5" width="17" height="17" rx="3"></rect>
            </svg>
        </span>
    `;
}

function getTrashIcon() {
    return `
        <span class="action-icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M8 6V4h8v2"></path>
                <path d="M18 6l-1 14H7L6 6"></path>
                <path d="M10 11v6"></path>
                <path d="M14 11v6"></path>
            </svg>
        </span>
    `;
}

// Actualizar estado de tarea en Supabase
export async function toggleTaskStatus(taskId, currentStatus) {
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
export async function deleteTask(taskId) {
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

// Mostrar mensajes en el formulario de acceso
function showAuthMessage(message, type = "") {
    authMessage.textContent = message;
    authMessage.className = `auth-message ${type}`;
}

// Mostrar la aplicación o el inicio de sesión según haya sesión activa
export function updateAuthenticationView(session) {
    currentUser = session?.user ?? null;

    if (currentUser) {
        authSection.hidden = true;
        appContent.hidden = false;

        userUsername.textContent = currentUser.user_metadata?.username ?? "";

        showAuthMessage("");

        fetchTasks();
    } else {
        authSection.hidden = false;
        appContent.hidden = true;

        userUsername.textContent = "";

        tasksCache = [];
        renderTasks([]);

        showLoginForm();
    }
}

// Comprobar si el usuario ya tenía una sesión abierta
async function initializeAuthentication() {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
        console.error("Error al comprobar la sesión:", error.message);
        showAuthMessage("No se pudo comprobar la sesión.", "error");
        return;
    }

    updateAuthenticationView(data.session);
}

// Alternar entre el formulario de inicio de sesión y el de registro
function showLoginForm() {
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
    showLoginTab.classList.add("active");
    showRegisterTab.classList.remove("active");
    showAuthMessage("");
}

function showRegisterForm() {
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");
    showLoginTab.classList.remove("active");
    showRegisterTab.classList.add("active");
    showAuthMessage("");
}

showLoginTab.addEventListener("click", showLoginForm);
showRegisterTab.addEventListener("click", showRegisterForm);

// Iniciar sesión
loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const username = loginUsername.value.trim();
    const password = loginPassword.value;

    if (!username || !password) {
        showAuthMessage("Completa el usuario y la contraseña.", "error");
        return;
    }

    showAuthMessage("Iniciando sesión...");

    const { error } = await supabaseClient.auth.signInWithPassword({
        email: usernameToEmail(username),
        password
    });

    if (error) {
        console.error("Error al iniciar sesión:", error.message);
        showAuthMessage("Usuario o contraseña incorrectos.", "error");
        return;
    }

    loginForm.reset();
    showAuthMessage("");
});

// Crear una cuenta
registerForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const username = registerUsername.value.trim();
    const password = registerPassword.value;

    if (!USERNAME_PATTERN.test(username)) {
        showAuthMessage("El usuario debe tener 3-30 caracteres: letras, números, punto, guion o guion bajo.", "error");
        return;
    }

    if (password.length < 6) {
        showAuthMessage("La contraseña debe tener mínimo 6 caracteres.", "error");
        return;
    }

    showAuthMessage("Creando cuenta...");

    const { error } = await supabaseClient.auth.signUp({
        email: usernameToEmail(username),
        password,
        options: { data: { username } }
    });

    if (error) {
        console.error("Error al crear la cuenta:", error.message);
        showAuthMessage(
            error.message === "User already registered"
                ? "Ese nombre de usuario ya está en uso."
                : error.message,
            "error"
        );
        return;
    }

    registerForm.reset();
    showAuthMessage("Cuenta creada correctamente. Ya puedes iniciar sesión.", "success");
});

// Cerrar sesión
logoutButton.addEventListener("click", async function () {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        console.error("Error al cerrar sesión:", error.message);
        alert("No se pudo cerrar la sesión.");
    }
});

// Detectar inicio o cierre de sesión
supabaseClient.auth.onAuthStateChange(function (_event, session) {
    updateAuthenticationView(session);
});

// Iniciar el sistema de autenticación
document.addEventListener("DOMContentLoaded", initializeAuthentication);
