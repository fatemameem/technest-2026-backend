import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { PRIORITIES, text } from "../utils.js";

const STATUSES = ["New", "In Progress", "Resolved"];

const toCase = (row) => ({
  id: row.id,
  resident: row.resident,
  contact: row.contact,
  issueType: row.issue_type,
  priority: row.priority,
  status: row.status,
  assignedTo: row.assigned_to,
  description: row.description,
  notes: row.notes,
  updatedAt: row.updated_at,
});

const router = Router();
router.use(requireAuth);

router.post("/", async (req, res) => {
  const resident = text(req.body.resident, 120) || req.user.fullName || "";
  const contact = text(req.body.contact, 200);
  const issueType = text(req.body.issueType, 80);
  const description = text(req.body.description, 5000);
  const priority = req.body.priority ?? "Medium";

  if (!resident || !contact || !issueType || !description) {
    return res.status(400).json({
      error: "resident, contact, issueType and description are required",
    });
  }
  if (!PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: "Invalid priority" });
  }

  const { data, error } = await supabase
    .from("support_cases")
    .insert({
      user_id: req.user.id,
      resident,
      contact,
      issue_type: issueType,
      priority,
      description,
      follow_up: req.body.followUp !== false,
    })
    .select()
    .single();
  if (error) throw error;

  res.status(201).json(toCase(data));
});

router.get("/mine", async (req, res) => {
  const { data, error } = await supabase
    .from("support_cases")
    .select()
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  res.json(data.map(toCase));
});

router.get("/assignees", requireRole("admin"), async (_req, res) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("role", "admin");
  if (error) throw error;
  res.json(data.map((p) => p.full_name).filter(Boolean));
});

router.get("/", requireRole("admin"), async (_req, res) => {
  const { data, error } = await supabase
    .from("support_cases")
    .select()
    .order("updated_at", { ascending: false });
  if (error) throw error;
  res.json(data.map(toCase));
});

router.patch("/:id", requireRole("admin"), async (req, res) => {
  const update = { updated_at: new Date().toISOString() };

  if (req.body.status !== undefined) {
    if (!STATUSES.includes(req.body.status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    update.status = req.body.status;
  }
  if (req.body.notes !== undefined) update.notes = text(req.body.notes, 5000);
  if (req.body.assignedTo !== undefined) {
    update.assigned_to = text(req.body.assignedTo, 120) || null;
  }

  const { data, error } = await supabase
    .from("support_cases")
    .update(update)
    .eq("id", req.params.id)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ error: "Case not found" });

  res.json(toCase(data));
});

export default router;
