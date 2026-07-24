import { defineConfig } from "vitest/config";

// Tests unitaires (modules PURS de lib/). N'inclut QUE lib/**/*.test.ts → n'exécute rien de
// l'app Next ni des e2e Playwright. Voir lib/promo-scope.test.ts (Lot 7b).
export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
});
