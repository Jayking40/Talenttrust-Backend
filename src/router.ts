import express from "express";
const { Request, Response, NextFunction } = express;
import * as http from "http";
import type { IncomingHttpHeaders } from "http";

/**
 * Simple blue-green router using Node http proxy (no extra deps).
 * Proxies /api/* to ACTIVE_COLOR.
 */
export const routerApp = express();
routerApp.use(express.json());

const getActiveBackendUrl = (): string => {
  const color = process.env.ACTIVE_COLOR || "blue";
  const port =
    color === "green"
      ? process.env.GREEN_PORT || "3002"
      : process.env.BLUE_PORT || "3001";
  return `http://localhost:${port}`;
};

// Simple proxy middleware (no dep)
routerApp.use("/api", (req: Request, res: Response, next: NextFunction) => {
  const target = getActiveBackendUrl();
  console.log(`Routing ${req.method} ${req.url} to ${target}`);

  const headers = Object.fromEntries(
    Object.entries(req.headers as IncomingHttpHeaders).filter(
      ([key]) => key.toLowerCase() !== "host",
    ),
  ) as IncomingHttpHeaders;

  const proxyReq = http.request(
    target + req.url,
    {
      method: req.method,
      headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode!, proxyRes.headers);
      proxyRes.pipe(res);
      proxyRes.on("error", (err) => {
        console.error("Proxy response error:", err);
        if (!res.headersSent) {
          res.status(502).json({ error: "Backend response error" });
        }
      });
    },
  );

  req.pipe(proxyReq);
  req.on("end", () => {
    proxyReq.end();
  });
  req.on("error", (err) => {
    console.error("Client request error:", err);
    proxyReq.destroy();
    next(err);
  });

  proxyReq.on("error", (err) => {
    console.error("Proxy request error:", err);
    if (!res.headersSent) {
      res.status(502).json({ error: "Backend unavailable" });
    }
    next(err);
  });
});

routerApp.get("/health/router", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    component: "router",
    active: getActiveBackendUrl(),
  });
});

