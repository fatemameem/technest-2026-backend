import { randomUUID } from "node:crypto";
import { Router } from "express";
import multer from "multer";
import { supabase } from "../config/supabase.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { PRIORITIES, isUuid, text } from "../utils.js";

const STATUSES = ["New", "In Progress", "Resolved"];
const BUCKET = "case-attachments";
const MAX_FILES = 5;
const MAX_FILES_PER_INCIDENT = 10;
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "message/rfc822",
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: MAX_FILES },
  fileFilter: (_req, file, cb) =>
    ALLOWED_TYPES.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error(`File type not allowed: ${file.originalname}`)),
});

const receiveFiles = (req, res, next) =>
  upload.array("files", MAX_FILES)(req, res, (err) =>
    err ? res.status(400).json({ error: err.message }) : next(),
  );

const WITH_COUNT = "*, incident_attachments(count)";

const toIncident = (row) => ({
  id: row.id,
  resident: row.resident,
  email: row.email,
  phone: row.phone,
  issueType: row.issue_type,
  urgency: row.urgency,
  status: row.status,
  description: row.description,
  date: row.created_at.slice(0, 10),
  assignedTo: row.assigned_to,
  attachmentCount: row.incident_attachments?.[0]?.count ?? 0,
});

// Loads the incident if the caller owns it or is an admin; otherwise responds 404.
async function loadAccessibleIncident(req, res) {
  const { id } = req.params;
  const { data, error } = isUuid(id)
    ? await supabase.from("incidents").select("id, user_id").eq("id", id).maybeSingle()
    : { data: null, error: null };
  if (error) throw error;
  if (!data || (data.user_id !== req.user.id && req.user.role !== "admin")) {
    res.status(404).json({ error: "Incident not found" });
    return null;
  }
  return data;
}

const router = Router();
router.use(requireAuth);

router.post("/", async (req, res) => {
  const resident = text(req.body.resident, 120) || req.user.fullName || "";
  const issueType = text(req.body.issueType, 80);
  const description = text(req.body.description, 5000);
  const urgency = req.body.urgency ?? "Medium";

  if (!resident || !issueType || !description) {
    return res
      .status(400)
      .json({ error: "resident, issueType and description are required" });
  }
  if (!PRIORITIES.includes(urgency)) {
    return res.status(400).json({ error: "Invalid urgency" });
  }

  const { data, error } = await supabase
    .from("incidents")
    .insert({
      user_id: req.user.id,
      resident,
      email: text(req.body.email, 200) || null,
      phone: text(req.body.phone, 40) || null,
      issue_type: issueType,
      urgency,
      description,
    })
    .select()
    .single();
  if (error) throw error;

  res.status(201).json(toIncident(data));
});

router.get("/mine", async (req, res) => {
  const { data, error } = await supabase
    .from("incidents")
    .select(WITH_COUNT)
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  res.json(data.map(toIncident));
});

router.get("/", requireRole("admin"), async (_req, res) => {
  const { data, error } = await supabase
    .from("incidents")
    .select(WITH_COUNT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  res.json(data.map(toIncident));
});

router.post("/:id/attachments", receiveFiles, async (req, res) => {
  const incident = await loadAccessibleIncident(req, res);
  if (!incident) return;

  const files = req.files ?? [];
  if (files.length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }

  const { count, error: countError } = await supabase
    .from("incident_attachments")
    .select("id", { count: "exact", head: true })
    .eq("incident_id", incident.id);
  if (countError) throw countError;
  if (count + files.length > MAX_FILES_PER_INCIDENT) {
    return res
      .status(400)
      .json({ error: `At most ${MAX_FILES_PER_INCIDENT} files per case` });
  }

  const uploaded = [];
  try {
    for (const file of files) {
      const path = `${incident.id}/${randomUUID()}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file.buffer, { contentType: file.mimetype });
      if (error) throw error;
      uploaded.push({
        incident_id: incident.id,
        file_name: text(file.originalname.replace(/[\\/\u0000-\u001f]/g, "_"), 200) || "file",
        content_type: file.mimetype,
        size_bytes: file.size,
        path,
      });
    }
    const { error } = await supabase.from("incident_attachments").insert(uploaded);
    if (error) throw error;
  } catch (err) {
    await supabase.storage.from(BUCKET).remove(uploaded.map((u) => u.path));
    throw err;
  }

  res.status(201).json({ uploaded: uploaded.length });
});

router.get("/:id/attachments", async (req, res) => {
  const incident = await loadAccessibleIncident(req, res);
  if (!incident) return;

  const { data, error } = await supabase
    .from("incident_attachments")
    .select()
    .eq("incident_id", incident.id)
    .order("created_at", { ascending: true });
  if (error) throw error;

  // Short-lived signed URLs that force a download instead of rendering in-browser.
  const files = await Promise.all(
    data.map(async (a) => {
      const { data: signed, error: signError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(a.path, 300, { download: a.file_name });
      if (signError) throw signError;
      return {
        id: a.id,
        fileName: a.file_name,
        contentType: a.content_type,
        size: a.size_bytes,
        url: signed.signedUrl,
      };
    }),
  );
  res.json(files);
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
    .from("incidents")
    .update(update)
    .eq("id", req.params.id)
    .select(WITH_COUNT)
    .maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ error: "Incident not found" });

  res.json(toIncident(data));
});

export default router;
