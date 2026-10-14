import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { isUuid, text } from "../utils.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function findUserByEmail(email) {
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) throw error;
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
}

// Promotes an existing account, or creates a confirmed one. Returns { error } on bad input.
export async function makeAdmin(body) {
  const email = text(body.email, 200).toLowerCase();
  const fullName = text(body.fullName, 120);
  const password = typeof body.password === "string" ? body.password : "";

  if (!EMAIL.test(email)) return { error: "A valid email is required" };

  let user = await findUserByEmail(email);
  if (!user) {
    if (password.length < 8) {
      return { error: "Password must be at least 8 characters" };
    }
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error) return { error: error.message };
    user = data.user;
  }

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    role: "admin",
    ...(fullName && { full_name: fullName }),
  });
  if (error) throw error;
  return { user };
}

const router = Router();
router.use(requireAuth, requireRole("admin"));

router.get("/", async (_req, res) => {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "admin");
  if (error) throw error;

  const { data, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) throw listError;
  const emails = new Map(data.users.map((u) => [u.id, u.email]));

  res.json(
    profiles.map((p) => ({
      id: p.id,
      fullName: p.full_name,
      email: emails.get(p.id) ?? "",
    })),
  );
});

router.post("/", async (req, res) => {
  const result = await makeAdmin(req.body);
  if (result.error) return res.status(400).json({ error: result.error });
  res.status(201).json({ id: result.user.id, email: result.user.email });
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  if (!isUuid(id)) return res.status(404).json({ error: "Admin not found" });
  if (id === req.user.id) {
    return res.status(400).json({ error: "You cannot remove your own admin access" });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ role: "customer" })
    .eq("id", id)
    .eq("role", "admin")
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ error: "Admin not found" });

  res.json({ id });
});

export default router;
