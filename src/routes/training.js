import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

// Returns programs with enrollment counts and whether `userId` is registered.
async function listPrograms(userId, programId) {
  let query = supabase
    .from("training_programs")
    .select()
    .order("next_session", { ascending: true, nullsFirst: false });
  if (programId) query = query.eq("id", programId);

  const { data: programs, error } = await query;
  if (error) throw error;

  const { data: regs, error: regError } = await supabase
    .from("training_registrations")
    .select("program_id, user_id")
    .in(
      "program_id",
      programs.map((p) => p.id),
    );
  if (regError) throw regError;

  return programs.map((p) => {
    const mine = regs.filter((r) => r.program_id === p.id);
    return {
      id: p.id,
      title: p.title,
      category: p.category,
      description: p.description,
      capacity: p.capacity,
      nextSession: p.next_session,
      enrolled: mine.length,
      registered: mine.some((r) => r.user_id === userId),
    };
  });
}

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  res.json(await listPrograms(req.user.id));
});

router.post("/:id/register", async (req, res) => {
  const [program] = await listPrograms(req.user.id, req.params.id);
  if (!program) return res.status(404).json({ error: "Program not found" });
  if (!program.registered && program.enrolled >= program.capacity) {
    return res.status(409).json({ error: "Session is full" });
  }

  const { error } = await supabase
    .from("training_registrations")
    .upsert(
      { program_id: program.id, user_id: req.user.id },
      { onConflict: "program_id,user_id", ignoreDuplicates: true },
    );
  if (error) throw error;

  const [updated] = await listPrograms(req.user.id, program.id);
  res.json(updated);
});

router.delete("/:id/register", async (req, res) => {
  const { error } = await supabase
    .from("training_registrations")
    .delete()
    .eq("program_id", req.params.id)
    .eq("user_id", req.user.id);
  if (error) throw error;

  const [updated] = await listPrograms(req.user.id, req.params.id);
  if (!updated) return res.status(404).json({ error: "Program not found" });
  res.json(updated);
});

router.patch("/:id", requireRole("admin"), async (req, res) => {
  const [program] = await listPrograms(req.user.id, req.params.id);
  if (!program) return res.status(404).json({ error: "Program not found" });

  const update = {};

  if (req.body.nextSession !== undefined) {
    const date = new Date(req.body.nextSession);
    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({ error: "Invalid nextSession" });
    }
    update.next_session = date.toISOString();
  }
  if (req.body.capacity !== undefined) {
    const capacity = Number.parseInt(req.body.capacity, 10);
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 200) {
      return res.status(400).json({ error: "capacity must be 1-200" });
    }
    if (capacity < program.enrolled) {
      return res
        .status(400)
        .json({ error: `${program.enrolled} residents are already registered` });
    }
    update.capacity = capacity;
  }
  if (Object.keys(update).length === 0) {
    return res.status(400).json({ error: "Nothing to update" });
  }

  const { error } = await supabase
    .from("training_programs")
    .update(update)
    .eq("id", program.id);
  if (error) throw error;

  const [updated] = await listPrograms(req.user.id, program.id);
  res.json(updated);
});

export default router;
