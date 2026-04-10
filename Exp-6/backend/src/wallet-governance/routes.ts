import { Router } from "express";

import { requireAuth } from "../auth/auth.middleware.js";
import { sendSuccess } from "../lib/http.js";
import { walletStatusService } from "./wallet-status.service.js";

export const walletGovernanceRouter = Router();

walletGovernanceRouter.get("/wallet/status", requireAuth, async (req, res) => {
  const status = await walletStatusService.getWalletStatus(req.auth!.wallet, req.auth!.role);
  sendSuccess(res, 200, status);
});
