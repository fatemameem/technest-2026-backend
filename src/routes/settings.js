import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { text } from "../utils.js";

const FLAGS = {
  notifyIncidents: "notify_incidents",
  notifyTraining: "notify_training",
  weeklyDigest: "weekly_digest",
  productUpdates: "product_updates",
};

const toSettings = (row) => ({
  name: row.name,
  region: row.region,
  contactEmail: row.contact_email,
  notifyIncidents: row.notify_incidents,
  notifyTraining: row.notify_training,
  weeklyDigest: row.weekly_digest,
  productUpdates: row.product_updates,
});

const router = Router();
router.use(requireAuth, requireRole("admin"));

router.get("/", async (_req, res) => {
  const { data, error } = await supabase
    .from("council_settings")
    .select()
    .eq("id", 1)
    .single();
  if (error) throw error;
  res.json(toSettings(data));
});

router.put("/", async (req, res) => {
  const update = {};

  for (const [key, column] of [
    ["name", "name"],
    ["region", "region"],
    ["contactEmail", "contact_email"],
  ]) {
    if (req.body[key] !== undefined) {
      const value = text(req.body[key], 200);
      if (!value) return res.status(400).json({ error: `${key} is required` });
      update[column] = value;
    }
  }
  for (const [key, column] of Object.entries(FLAGS)) {
    if (req.body[key] !== undefined) {
      if (typeof req.body[key] !== "boolean") {
        return res.status(400).json({ error: `${key} must be a boolean` });
      }
      update[column] = req.body[key];
    }
  }
  if (Object.keys(update).length === 0) {
    return res.status(400).json({ error: "Nothing to update" });
  }

  const { data, error } = await supabase
    .from("council_settings")
    .update(update)
    .eq("id", 1)
    .select()
    .single();
  if (error) throw error;
  res.json(toSettings(data));
});

export default router;
