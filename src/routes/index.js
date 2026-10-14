import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import incidents from "./incidents.js";
import supportCases from "./supportCases.js";
import auditRequests from "./auditRequests.js";
import training from "./training.js";
import notifications from "./notifications.js";
import settings from "./settings.js";
import admins from "./admins.js";
import setup from "./setup.js";
import contact from "./contact.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Frontend calls this after Supabase sign-in to learn the user's role.
router.get("/me", requireAuth, (req, res) => {
  res.json(req.user);
});

router.use("/incidents", incidents);
router.use("/support-cases", supportCases);
router.use("/audit-requests", auditRequests);
router.use("/training", training);
router.use("/notifications", notifications);
router.use("/settings", settings);
router.use("/admins", admins);
router.use("/setup", setup);
router.use("/contact", contact);

export default router;
