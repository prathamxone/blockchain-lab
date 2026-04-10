function ensureEnv(key: string, value: string): void {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

ensureEnv("NODE_ENV", "test");
ensureEnv("PORT", "4000");
ensureEnv("API_BASE_PATH", "/api/v1");
ensureEnv("FRONTEND_ORIGINS", "http://localhost:5173,http://localhost:4173");
ensureEnv("CORS_ALLOW_CREDENTIALS", "true");

ensureEnv("JWT_ACCESS_SECRET", "test_access_secret_1234567890");
ensureEnv("JWT_REFRESH_SECRET", "test_refresh_secret_1234567890");
ensureEnv("JWT_ACCESS_TTL_SEC", "900");
ensureEnv("JWT_REFRESH_TTL_SEC", "604800");
ensureEnv("SESSION_IDLE_TIMEOUT_SEC", "1800");
ensureEnv("CSRF_SECRET", "test_csrf_secret_1234567890");

ensureEnv("INTERNAL_API_KEY", "internal_test_api_key_123456");
ensureEnv("CRON_SECRET", "cron_test_secret_123456");
ensureEnv("READY_IP_ALLOWLIST", "");

ensureEnv("TURSO_DATABASE_URL", "libsql://test-db.turso.io");
ensureEnv("TURSO_AUTH_TOKEN", "test_turso_token");

ensureEnv("UPSTASH_REDIS_REST_URL", "https://test.upstash.io");
ensureEnv("UPSTASH_REDIS_REST_TOKEN", "test_upstash_token");

ensureEnv("R2_ACCOUNT_ID", "test-account");
ensureEnv("R2_BUCKET", "test-bucket");
ensureEnv("R2_ACCESS_KEY_ID", "test-access-key");
ensureEnv("R2_SECRET_ACCESS_KEY", "test-secret-key");
ensureEnv("R2_REGION", "auto");

ensureEnv("KYC_ENC_ACTIVE_KEY_VERSION", "v1");
ensureEnv("KYC_ENC_KEY_V1_BASE64", "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=");
ensureEnv("KYC_HASH_SALT", "test_kyc_hash_salt_123456");

ensureEnv("SCAN_ADAPTER_ENABLED", "true");
ensureEnv("CHAIN_ID", "11155111");
ensureEnv("RPC_URL", "https://rpc.sepolia.example.test");

ensureEnv("UPLOAD_CONTRACT_TTL_SEC", "600");
ensureEnv("UPLOAD_DOC_MAX_BYTES", "10485760");
ensureEnv("UPLOAD_PROFILE_MAX_BYTES", "5242880");

ensureEnv("VOTE_TOKEN_TTL_SEC", "60");
ensureEnv("VOTE_TIMEOUT_LOOKUP_WINDOW_SEC", "120");
