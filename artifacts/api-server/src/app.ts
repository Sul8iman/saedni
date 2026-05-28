import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.SESSION_SECRET ?? "saidni_secret"));

// Simple in-memory session store (MVP — replace with express-session + DB for production)
const sessions: Record<string, { userId?: number }> = {};

app.use((req, _res, next) => {
  const sid = (req as any).signedCookies?.sid || req.cookies?.sid;
  if (sid && sessions[sid]) {
    (req as any).session = sessions[sid];
  } else {
    // Create a new session ID
    const newSid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessions[newSid] = {};
    (req as any).session = sessions[newSid];
    (req as any).sessionId = newSid;
  }
  next();
});

app.use("/api", router);

export default app;
