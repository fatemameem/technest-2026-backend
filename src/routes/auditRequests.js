import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { text } from "../utils.js";

const STATUSES = ["New", "In Progress", "Completed"];
const CONTACT_METHODS = ["Email", "Phone", "In Person"];

const toAudit = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  target: row.target,
  deviceCount: row.device_count,
  contactMethod: row.contact_method,
  preferredTime: row.preferred_time,
  context: row.context,
  status: row.status,
  assignedTo: row.assigned_to,
  date: row.created_at.slice(0, 10),
});

const router = Router();
router.use(requireAuth);

router.post("/", async (req, res) => {
  const name = text(req.body.name, 120) || req.user.fullName || "";
  const email = text(req.body.email, 200);
  const target = text(req.body.target, 120);
  const contactMethod = req.body.contactMethod;
  const deviceCount = Number.parseInt(req.body.deviceCount ?? 1, 10);

  if (!name || !email || !target) {
    return res
      .status(400)
      .json({ error: "name, email and target are required" });
  }
  if (!CONTACT_METHODS.includes(contactMethod)) {
    return res.status(400).json({ error: "Invalid contactMethod" });
  }
  if (!Number.isInteger(deviceCount) || deviceCount < 1) {
    return res.status(400).json({ error: "Invalid deviceCount" });
  }

  const { data, error } = await supabase
    .from("audit_requests")
    .insert({
      user_id: req.user.id,
      name,
      email,
      target,
      device_count: deviceCount,
      contact_method: contactMethod,
      preferred_time: text(req.body.preferredTime, 200) || null,
      context: text(req.body.context, 5000) || null,
    })
    .select()
    .single();
  if (error) throw error;

  res.status(201).json(toAudit(data));
});

router.get("/mine", async (req, res) => {
  const { data, error } = await supabase
    .from("audit_requests")
    .select()
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  res.json(data.map(toAudit));
});

router.get("/", requireRole("admin"), async (_req, res) => {
  const { data, error } = await supabase
    .from("audit_requests")
    .select()
    .order("created_at", { ascending: false });
  if (error) throw error;
  res.json(data.map(toAudit));
});

router.patch("/:id", requireRole("admin"), async (req, res) => {
  const update = {};

  if (req.body.status !== undefined) {
    if (!STATUSES.includes(req.body.status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    update.status = req.body.status;
  }
  if (req.body.assignedTo !== undefined) {
    update.assigned_to = text(req.body.assignedTo, 120) || null;
  }
  if (Object.keys(update).length === 0) {
    return res.status(400).json({ error: "Nothing to update" });
  }

  const { data, error } = await supabase
    .from("audit_requests")
    .update(update)
    .eq("id", req.params.id)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ error: "Audit request not found" });

  res.json(toAudit(data));
});

export default router;
