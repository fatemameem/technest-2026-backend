import { createHash, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { makeAdmin } from "./admins.js";

const sha256 = (v) => createHash("sha256").update(String(v)).digest();

async function adminCount() {
  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  if (error) throw error;
  return count;
}

const router = Router();

// First-run setup only works while no admin exists and SETUP_TOKEN is configured.
router.get("/status", async (_req, res) => {
  res.json({
    needsSetup: Boolean(process.env.SETUP_TOKEN) && (await adminCount()) === 0,
  });
});

router.post("/", async (req, res) => {
  const expected = process.env.SETUP_TOKEN;
  if (!expected || (await adminCount()) > 0) {
    return res.status(403).json({ error: "Setup is not available" });
  }
  if (!timingSafeEqual(sha256(req.body.setupToken ?? ""), sha256(expected))) {
    return res.status(403).json({ error: "Invalid setup token" });
  }

  const result = await makeAdmin(req.body);
  if (result.error) return res.status(400).json({ error: result.error });
  res.status(201).json({ email: result.user.email });
});

export default router;
