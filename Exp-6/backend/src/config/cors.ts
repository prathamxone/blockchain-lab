import cors, { type CorsOptions } from "cors";

import { env } from "./env.js";

const allowedOrigins = new Set(env.FRONTEND_ORIGINS);

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS_ORIGIN_FORBIDDEN:${origin}`));
  },
  credentials: env.CORS_ALLOW_CREDENTIALS,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Authorization",
    "Content-Type",
    "X-Request-Id",
    "X-CSRF-Token",
    "X-Internal-Api-Key"
  ],
  exposedHeaders: ["X-Request-Id"],
  maxAge: 600
};

export const corsMiddleware = cors(corsOptions);
