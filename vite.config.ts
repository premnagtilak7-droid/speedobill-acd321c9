import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

const DEFAULT_CLOUD_PROJECT_ID = "pkpefscbpyqpafogdbor";
const DEFAULT_CLOUD_SUPABASE_URL = `https://${DEFAULT_CLOUD_PROJECT_ID}.supabase.co`;
const DEFAULT_CLOUD_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrcGVmc2NicHlxcGFmb2dkYm9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTg5NDMsImV4cCI6MjA4OTU5NDk0M30.wXNGPD0KHv7A-gQmLt0Cn6585-3hCpdWoyjK3YW3GKU";

function normalizeEnvValue(value?: string) {
  return value?.trim().replace(/^['"]+|['"]+$/g, "") ?? "";
}

function decodeJwtPayload(token: string) {
  try {
    const encodedPayload = token.split(".")[1];
    if (!encodedPayload) {
      return null;
    }

    const normalizedPayload = encodedPayload
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(encodedPayload.length / 4) * 4, "=");

    return JSON.parse(Buffer.from(normalizedPayload, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function deriveProjectIdFromUrl(url: string) {
  try {
    return new URL(url).hostname.split(".")[0] || "";
  } catch {
    return "";
  }
}

function deriveProjectIdFromKey(key: string) {
  const payload = decodeJwtPayload(key);
  const projectId =
    (typeof payload?.ref === "string" && payload.ref) ||
    (typeof payload?.project_id === "string" && payload.project_id) ||
    "";

  return normalizeEnvValue(projectId);
}

function resolveBuildSupabaseEnv(env: Record<string, string>) {
  const envUrl = normalizeEnvValue(env.VITE_SUPABASE_URL);
  const envKey =
    normalizeEnvValue(env.VITE_SUPABASE_PUBLISHABLE_KEY) ||
    normalizeEnvValue(env.VITE_SUPABASE_ANON_KEY) ||
    "";
  const envProjectId = normalizeEnvValue(env.VITE_SUPABASE_PROJECT_ID);
  const urlProjectId = envUrl ? deriveProjectIdFromUrl(envUrl) : "";
  const keyProjectId = envKey ? deriveProjectIdFromKey(envKey) : "";

  if (envKey && keyProjectId === DEFAULT_CLOUD_PROJECT_ID) {
    return {
      projectId: keyProjectId,
      url: `https://${keyProjectId}.supabase.co`,
      key: envKey,
    };
  }

  if (envProjectId === DEFAULT_CLOUD_PROJECT_ID || urlProjectId === DEFAULT_CLOUD_PROJECT_ID) {
    return {
      projectId: DEFAULT_CLOUD_PROJECT_ID,
      url: envUrl || DEFAULT_CLOUD_SUPABASE_URL,
      key: envKey || DEFAULT_CLOUD_PUBLISHABLE_KEY,
    };
  }

  return {
    projectId: DEFAULT_CLOUD_PROJECT_ID,
    url: DEFAULT_CLOUD_SUPABASE_URL,
    key: DEFAULT_CLOUD_PUBLISHABLE_KEY,
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const cloudPublicEnv = resolveBuildSupabaseEnv(env);

  return {
    define: {
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(cloudPublicEnv.projectId),
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(cloudPublicEnv.url),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(cloudPublicEnv.key),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(cloudPublicEnv.key),
    },
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      VitePWA({
        registerType: "autoUpdate",
        devOptions: { enabled: false },
        includeAssets: ["favicon.ico", "robots.txt"],
        manifest: {
          name: "Speedo Bill - Canteen Management",
          short_name: "Speedo Bill",
          description: "Smart Canteen Management System",
          theme_color: "#F97316",
          background_color: "#F8F8F8",
          display: "standalone",
          orientation: "portrait",
          start_url: "/",
          icons: [
            {
              src: "/favicon.ico",
              sizes: "64x64",
              type: "image/x-icon",
            },
            {
              src: "/pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "/pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable",
            },
          ],
        },
        workbox: {
          navigateFallbackDenylist: [/^\/~oauth/],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/menu-images\/.*/,
              handler: "CacheFirst",
              options: {
                cacheName: "menu-images-cache",
                expiration: {
                  maxEntries: 500,
                  maxAgeSeconds: 7 * 24 * 60 * 60,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "google-fonts-cache",
              },
            },
          ],
        },
      }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime"],
    },
  };
});
