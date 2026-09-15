import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// La raíz del proyecto es el directorio padre (cloudtasks-equipo13/), no esta carpeta,
// para que la cobertura pueda ver el código real en js/ sin importar desde dónde se invoque `npm test`.
const projectRoot = fileURLToPath(new URL("..", import.meta.url));

export default defineConfig({
    root: projectRoot,
    test: {
        environment: "jsdom",
        globals: false,
        include: ["testing/tests/**/*.test.js"],
        coverage: {
            provider: "v8",
            reporter: ["text", "html"],
            reportsDirectory: "testing/coverage",
            include: ["js/**/*.js"]
        }
    }
});
