import cors from "cors";
import express from "express";
import routes from "./routes/index.js";

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") }));
app.use(express.json());

app.use("/api", routes);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Express identifies error handlers by their 4-arg signature.
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
