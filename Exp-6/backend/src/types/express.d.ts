declare namespace Express {
  interface AuthContext {
    wallet: string;
    role: string;
    sessionId: string;
  }

  interface Request {
    requestId: string;
    auth?: AuthContext;
  }
}
