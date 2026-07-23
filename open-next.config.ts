import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Config del adapter OpenNext para Cloudflare Workers.
// Sin cache incremental (R2/KV) por ahora: la app es mayormente dinámica (auth).
export default defineCloudflareConfig();
