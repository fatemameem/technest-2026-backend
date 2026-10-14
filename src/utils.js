export const text = (v, max) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

export const PRIORITIES = ["Low", "Medium", "High"];

export const isUuid = (v) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
