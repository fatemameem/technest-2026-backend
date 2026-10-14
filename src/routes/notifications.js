import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const LIMIT = 10;

async function latestNew(table, columns) {
  const { data, error } = await supabase
    .from(table)
    .select(`id, created_at, ${columns}`)
    .eq("status", "New")
    .order("created_at", { ascending: false })
    .limit(LIMIT);
  if (error) throw error;
  return data;
}

const router = Router();
router.use(requireAuth, requireRole("admin"));

// Notifications are derived from unhandled (status "New") submissions.
router.get("/", async (_req, res) => {
  const [incidents, cases, audits] = await Promise.all([
    latestNew("incidents", "resident, issue_type"),
    latestNew("support_cases", "resident, issue_type"),
    latestNew("audit_requests", "name, target"),
  ]);

  const items = [
    ...incidents.map((r) => ({
      id: `incident-${r.id}`,
      title: `New incident: ${r.issue_type} — ${r.resident}`,
      to: "/incidents",
      createdAt: r.created_at,
    })),
    ...cases.map((r) => ({
      id: `case-${r.id}`,
      title: `New support request: ${r.issue_type} — ${r.resident}`,
      to: "/support",
      createdAt: r.created_at,
    })),
    ...audits.map((r) => ({
      id: `audit-${r.id}`,
      title: `New audit request: ${r.target} — ${r.name}`,
      to: "/audits",
      createdAt: r.created_at,
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  res.json(items);
});

export default router;
