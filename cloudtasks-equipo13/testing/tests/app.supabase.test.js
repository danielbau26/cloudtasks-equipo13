import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Mockeamos el cliente de Supabase antes de importar app.js, para no golpear la red real.
vi.mock("../../js/supabaseClient.js", () => ({
    supabaseClient: {
        from: vi.fn(),
        auth: {
            getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
            onAuthStateChange: vi.fn(),
            signInWithPassword: vi.fn(() => Promise.resolve({ error: null })),
            signUp: vi.fn(() => Promise.resolve({ data: {}, error: null })),
            signOut: vi.fn(() => Promise.resolve({ error: null }))
        }
    }
}));

// Construye un "query builder" falso que imita la cadena encadenable de supabase-js
// (from().select().order() / from().update().eq() / etc.) y que resuelve `result` al ser awaited.
function createQueryBuilder(result) {
    const builder = {};
    ["select", "order", "insert", "update", "delete", "eq"].forEach((method) => {
        builder[method] = vi.fn(() => builder);
    });
    builder.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
    return builder;
}

function loadIndexHtmlBody() {
    // Ruta absoluta al index.html real de la app, independiente del cwd desde el que corra vitest.
    // (el import.meta.url se guarda en una variable para evitar que Vite lo trate como un
    // "new URL(asset, import.meta.url)" y lo reescriba como una URL de dev-server)
    const currentModuleUrl = import.meta.url;
    const indexPath = fileURLToPath(new URL("../../index.html", currentModuleUrl));
    const html = readFileSync(indexPath, "utf-8");
    const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/g, "");
    const match = withoutScripts.match(/<body[^>]*>([\s\S]*)<\/body>/);
    return match ? match[1] : "";
}

async function flushPromises() {
    await new Promise((resolve) => setTimeout(resolve, 0));
}

let supabaseClient;
let app;

beforeAll(async () => {
    document.body.innerHTML = loadIndexHtmlBody();
    // jsdom no implementa alert/confirm; los stubeamos para controlar el flujo.
    vi.stubGlobal("alert", vi.fn());
    vi.stubGlobal("confirm", vi.fn(() => true));

    ({ supabaseClient } = await import("../../js/supabaseClient.js"));
    app = await import("../../js/app.js");

    // Simula una sesión activa para las pruebas que no son de autenticación.
    app.updateAuthenticationView({ user: { id: "test-user-id", user_metadata: { username: "testuser" } } });
    await flushPromises();
});

beforeEach(() => {
    supabaseClient.from.mockReset();
    global.alert.mockClear();
    global.confirm.mockClear();
    global.confirm.mockReturnValue(true);
});

describe("fetchTasks", () => {
    it("renderiza las tareas y oculta el aviso de error cuando Supabase responde bien", async () => {
        const tasks = [
            { id: 1, title: "A", description: "d", priority: "alta", deadline: "2026-09-20", completed: false },
            { id: 2, title: "B", description: "d", priority: "baja", deadline: "2026-09-21", completed: true }
        ];
        supabaseClient.from.mockReturnValue(createQueryBuilder({ data: tasks, error: null }));

        await app.fetchTasks();

        expect(document.getElementById("connection-error").hidden).toBe(true);
        expect(document.getElementById("pending-count").textContent).toBe("1");
        expect(document.getElementById("completed-count").textContent).toBe("1");
        expect(document.querySelectorAll("#pending-list .task-card").length).toBe(1);
        expect(document.querySelectorAll("#completed-list .task-card").length).toBe(1);
    });

    it("muestra el aviso de conexión cuando Supabase devuelve un error", async () => {
        supabaseClient.from.mockReturnValue(
            createQueryBuilder({ data: null, error: { message: "fallo de red" } })
        );

        await app.fetchTasks();

        expect(document.getElementById("connection-error").hidden).toBe(false);
    });
});

describe("toggleTaskStatus", () => {
    it("marca la tarea como completada y refresca la lista", async () => {
        const builder = createQueryBuilder({ data: [], error: null });
        supabaseClient.from.mockReturnValue(builder);

        await app.toggleTaskStatus(42, false);

        expect(supabaseClient.from).toHaveBeenCalledWith("tasks");
        expect(builder.update).toHaveBeenCalledWith({ completed: true });
        expect(builder.eq).toHaveBeenCalledWith("id", 42);
        expect(global.alert).not.toHaveBeenCalled();
    });

    it("avisa con un alert si Supabase falla al actualizar", async () => {
        supabaseClient.from.mockReturnValue(
            createQueryBuilder({ error: { message: "no se pudo actualizar" } })
        );

        await app.toggleTaskStatus(1, true);

        expect(global.alert).toHaveBeenCalledWith("Ocurrió un error al actualizar el estado de la tarea.");
    });
});

describe("deleteTask", () => {
    it("no elimina nada si el usuario cancela la confirmación", async () => {
        global.confirm.mockReturnValue(false);

        await app.deleteTask(7);

        expect(supabaseClient.from).not.toHaveBeenCalled();
    });

    it("elimina la tarea cuando el usuario confirma", async () => {
        const builder = createQueryBuilder({ error: null });
        supabaseClient.from.mockReturnValue(builder);

        await app.deleteTask(7);

        expect(supabaseClient.from).toHaveBeenCalledWith("tasks");
        expect(builder.delete).toHaveBeenCalled();
        expect(builder.eq).toHaveBeenCalledWith("id", 7);
    });

    it("avisa con un alert si Supabase falla al eliminar", async () => {
        supabaseClient.from.mockReturnValue(createQueryBuilder({ error: { message: "boom" } }));

        await app.deleteTask(7);

        expect(global.alert).toHaveBeenCalledWith("Ocurrió un error al eliminar la tarea.");
    });
});

describe("creación de tareas (submit del formulario)", () => {
    beforeEach(() => {
        document.getElementById("title").value = "Nueva tarea";
        document.getElementById("description").value = "Una descripción";
        document.getElementById("priority").value = "media";
        document.getElementById("deadline").value = "2026-10-01";
    });

    it("inserta la tarea en Supabase cuando el formulario es válido", async () => {
        const builder = createQueryBuilder({ error: null });
        supabaseClient.from.mockReturnValue(builder);

        document.getElementById("task-form").dispatchEvent(new Event("submit", { cancelable: true }));
        await flushPromises();

        expect(builder.insert).toHaveBeenCalledWith([
            expect.objectContaining({ title: "Nueva tarea", description: "Una descripción", priority: "media", deadline: "2026-10-01", completed: false, user_id: "test-user-id" })
        ]);
    });

    it("no llama a Supabase y muestra un alert si falta un campo", async () => {
        document.getElementById("title").value = "";
        supabaseClient.from.mockReturnValue(createQueryBuilder({ error: null }));

        document.getElementById("task-form").dispatchEvent(new Event("submit", { cancelable: true }));
        await flushPromises();

        expect(supabaseClient.from).not.toHaveBeenCalled();
        expect(global.alert).toHaveBeenCalledWith("Por favor, completa todos los campos.");
    });

    it("avisa con un alert si Supabase falla al crear la tarea", async () => {
        supabaseClient.from.mockReturnValue(
            createQueryBuilder({ error: { message: "no se pudo insertar" } })
        );

        document.getElementById("task-form").dispatchEvent(new Event("submit", { cancelable: true }));
        await flushPromises();

        expect(global.alert).toHaveBeenCalledWith("Ocurrió un error al guardar la tarea en la base de datos.");
    });
});

describe("autenticación", () => {
    afterEach(() => {
        // Restaura la sesión simulada y el tab de login para no afectar otras pruebas.
        app.updateAuthenticationView({ user: { id: "test-user-id", user_metadata: { username: "testuser" } } });
        document.getElementById("show-login-tab").dispatchEvent(new Event("click"));
    });

    it("updateAuthenticationView muestra la app y oculta el login cuando hay sesión", () => {
        app.updateAuthenticationView({ user: { id: "u1", user_metadata: { username: "u1" } } });

        expect(document.getElementById("auth-section").hidden).toBe(true);
        expect(document.getElementById("app-content").hidden).toBe(false);
        expect(document.getElementById("user-username").textContent).toBe("u1");
    });

    it("updateAuthenticationView oculta la app y muestra el login cuando no hay sesión", () => {
        app.updateAuthenticationView(null);

        expect(document.getElementById("auth-section").hidden).toBe(false);
        expect(document.getElementById("app-content").hidden).toBe(true);
        expect(document.getElementById("user-username").textContent).toBe("");
    });

    it("el tab 'Crear cuenta' muestra el formulario de registro y oculta el de login", () => {
        document.getElementById("show-register-tab").dispatchEvent(new Event("click"));

        expect(document.getElementById("login-form").classList.contains("hidden")).toBe(true);
        expect(document.getElementById("register-form").classList.contains("hidden")).toBe(false);

        document.getElementById("show-login-tab").dispatchEvent(new Event("click"));

        expect(document.getElementById("login-form").classList.contains("hidden")).toBe(false);
        expect(document.getElementById("register-form").classList.contains("hidden")).toBe(true);
    });

    it("inicia sesión con signInWithPassword usando un correo interno derivado del usuario", async () => {
        document.getElementById("login-username").value = "MiUsuario";
        document.getElementById("login-password").value = "secreto123";

        document.getElementById("login-form").dispatchEvent(new Event("submit", { cancelable: true }));
        await flushPromises();

        expect(supabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
            email: "miusuario@cloudtasks.local",
            password: "secreto123"
        });
    });

    it("muestra un mensaje de error si el login falla", async () => {
        supabaseClient.auth.signInWithPassword.mockResolvedValueOnce({ error: { message: "bad credentials" } });
        document.getElementById("login-username").value = "usuario";
        document.getElementById("login-password").value = "incorrecta";

        document.getElementById("login-form").dispatchEvent(new Event("submit", { cancelable: true }));
        await flushPromises();

        expect(document.getElementById("auth-message").textContent).toBe("Usuario o contraseña incorrectos.");
    });

    it("no llama a Supabase si el nombre de usuario tiene caracteres inválidos", async () => {
        document.getElementById("register-username").value = "usuario con espacios";
        document.getElementById("register-password").value = "secreto123";

        document.getElementById("register-form").dispatchEvent(new Event("submit", { cancelable: true }));
        await flushPromises();

        expect(supabaseClient.auth.signUp).not.toHaveBeenCalled();
    });

    it("crea una cuenta con signUp usando un correo interno derivado del usuario", async () => {
        document.getElementById("register-username").value = "NuevoUsuario";
        document.getElementById("register-password").value = "secreto123";

        document.getElementById("register-form").dispatchEvent(new Event("submit", { cancelable: true }));
        await flushPromises();

        expect(supabaseClient.auth.signUp).toHaveBeenCalledWith({
            email: "nuevousuario@cloudtasks.local",
            password: "secreto123",
            options: { data: { username: "NuevoUsuario" } }
        });
    });

    it("cierra sesión con signOut al pulsar 'Cerrar sesión'", async () => {
        document.getElementById("logout-button").dispatchEvent(new Event("click"));
        await flushPromises();

        expect(supabaseClient.auth.signOut).toHaveBeenCalled();
    });
});
