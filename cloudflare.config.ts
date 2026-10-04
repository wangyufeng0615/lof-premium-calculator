import { bindings, defineConfig, triggers } from "cf/config";

export default defineConfig({
	worker: {
		name: "lof-premium-calculator",
		compatibilityDate: "2024-12-01",
		entrypoint: "src/index.ts",
		observability: {
			issues: {
				enabled: true,
			},
		},
		triggers: [
			triggers.scheduled({
				schedule: "*/2 * * * *",
			}),
		],
		env: {
			ENVIRONMENT: bindings.text("production"),
			LOF_CACHE: bindings.kv({
				id: "5ad4794049a740a2ada3e22209295b26",
			}),
		},
	},
});
