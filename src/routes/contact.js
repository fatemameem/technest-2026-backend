import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// Public-facing council contact details, shown to residents.
router.get("/", async (_req, res) => {
  const { data, error } = await supabase
    .from("council_settings")
    .select("name, region, contact_email")
    .eq("id", 1)
    .single();
  if (error) throw error;
  res.json({
    name: data.name,
    region: data.region,
    email: data.contact_email,
  });
});

export default router;
