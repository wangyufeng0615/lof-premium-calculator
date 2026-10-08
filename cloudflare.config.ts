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
				// 交易日北京时间 14:00–15:58（UTC 06:00–07:58）每 2 分钟一次，一天一轮，收盘前出结果
				schedule: "*/2 6-7 * * MON-FRI",
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
