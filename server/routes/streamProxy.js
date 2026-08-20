import express from "express";
import httpProxy from "http-proxy";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import cacheService from "../services/cacheService.js";

const router = express.Router();
router.use(cookieParser());

const proxy = httpProxy.createProxyServer({
  ws: true,
  changeOrigin: true,
  xfwd: true,
});

// Extract stream token from subdomain
function getStreamToken(hostname = "") {
  const streamDomain = process.env.STREAM_DOMAIN;

  if (!streamDomain) {
    console.error("[StreamProxy] STREAM_DOMAIN is not configured");
    return null;
  }

  // Remove port if present
  hostname = hostname.split(":")[0].toLowerCase();

  const suffix = `.${streamDomain.toLowerCase()}`;

  // Must be: <token>.<STREAM_DOMAIN>
  if (!hostname.endsWith(suffix)) {
    return null;
  }

  const token = hostname.slice(0, -suffix.length);

  // Only allow one subdomain token
  if (!token || token.includes(".")) {
    return null;
  }

  return token;
}

// Verify auth cookie
function getUserIdFromCookie(req) {
  try {
    const token = req.cookies?.token;
    if (!token) return null;
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return payload.id ?? payload.userId ?? null;
  } catch {
    return null;
  }
}

/* ===============================
   HTTP Proxy for stream subdomain
================================ */
router.use(async (req, res) => {
  const streamToken = getStreamToken(req.hostname);

  if (!streamToken) {
    console.warn(
      `[StreamProxy] Invalid stream hostname: ${req.hostname}`
    );

    return res.sendStatus(404);
  }

  let cached;
  try {
    cached = await cacheService.get(`stream:${streamToken}`);
  } catch (err) {
    console.error("[StreamProxy] Cache error:", err);
    return res.sendStatus(500);
  }

  if (!cached) {
    console.warn(`[StreamProxy] No session for token: ${streamToken}`);
    return res.sendStatus(404);
  }

   if (cached.status !== "running") {
    console.warn(
      `[StreamProxy] Session not running (${cached.status}) for ${streamToken}`
    );
    return res.sendStatus(403);
  }


  //Auth User
//  const userId = getUserIdFromCookie(req);
//   if (!userId || userId !== cached.userId) {
//     console.warn(`[StreamProxy] User ID mismatch for token: ${streamToken}
//       Expected: ${cached.userId}, Got: ${userId}`);
//     return res.sendStatus(403);
//   }

  proxy.web(req, res, {
    target: `http://${cached.instanceIp}:8080`,
  });
});

/* ===============================
   Token-based streaming route
================================ */
// router.all("/:token*", async (req, res) => {
//   try {
//     const payload = jwt.verify(
//       req.params.token,
//       process.env.STREAM_SECRET
//     );

//     const cached = await cacheService.get(
//       `stream:${payload.sessionId}`
//     );

//     if (!cached) {
//       console.log(`[StreamProxy] Cache miss for stream:${payload.sessionId}`);
//       return res.sendStatus(404);
//     }

//     if (cached.userId !== payload.userId) {
//       console.log(`[StreamProxy] User mismatch`);
//       return res.sendStatus(403);
//     }

//     // Remove token from URL
//     const rest = req.params[0] || "/";
//     req.url = rest;

//     console.log(`[StreamProxy] ASG → http://${cached.instanceIp}:8080${req.url}`);

//     proxy.web(req, res, {
//       target: `http://${cached.instanceIp}:8080`,
//     });

//   } catch (err) {
//     console.error("[StreamProxy] Token verify error:", err);
//     res.sendStatus(403);
//   }
// });

/* ===============================
   WebSocket Upgrade Handler
================================ */
export async function handleWsUpgrade(req, socket, head) {
  const hostname = (req.headers.host || "").split(":")[0];
  const streamToken = getStreamToken(hostname);

  if (!streamToken) {
    console.warn(
      `[StreamProxy] Invalid WS hostname: ${hostname}`
    );

    socket.destroy();
    return;
  }

  console.log("[StreamProxy] Client requested WebSocket upgrade", {
    streamToken,
    url: req.url,
    userAgent: req.headers["user-agent"],
    remoteAddress: socket.remoteAddress,
  });

  // Detect if the CLIENT connection closes/errors.
  socket.on("close", (hadError) => {
    console.warn("[StreamProxy] Client WebSocket socket closed", {
      streamToken,
      hadError,
      remoteAddress: socket.remoteAddress,
    });
  });

  socket.on("error", (err) => {
    console.error("[StreamProxy] Client WebSocket socket error", {
      streamToken,
      message: err.message,
      code: err.code,
    });
  });

  try {
    const cached = await cacheService.get(`stream:${streamToken}`);

    if (!cached || cached.status !== "running") {
      console.warn(`[StreamProxy] WS blocked for ${streamToken}`);
      socket.destroy();
      return;
    }

    console.log("[StreamProxy] Proxying WebSocket", {
      streamToken,
      url: req.url,
      target: `${cached.instanceIp}:8080`,
    });

    proxy.ws(req, socket, head, {
      target: `http://${cached.instanceIp}:8080`,
    });

  } catch (err) {
    console.error("[StreamProxy] WS cache error:", err);
    socket.destroy();
  }
}
/* ===============================
   Proxy diagnostics + error handler
================================ */

proxy.on("proxyReq", (proxyReq, req) => {
  console.log("[StreamProxy] HTTP → upstream", {
    host: req.headers.host,
    method: req.method,
    url: req.url,
    userAgent: req.headers["user-agent"],
  });
});

proxy.on("proxyReqWs", (proxyReq, req) => {
  console.log("[StreamProxy] WS → upstream", {
    host: req.headers.host,
    url: req.url,
    userAgent: req.headers["user-agent"],
  });
});

proxy.on("proxyRes", (proxyRes, req) => {
  console.log("[StreamProxy] Upstream response", {
    host: req.headers.host,
    method: req.method,
    url: req.url,
    statusCode: proxyRes.statusCode,
  });
});

proxy.on("open", (proxySocket) => {
  console.log("[StreamProxy] Upstream WebSocket opened");

  proxySocket.on("close", (hadError) => {
    console.warn("[StreamProxy] Upstream WebSocket closed", {
      hadError,
    });
  });

  proxySocket.on("error", (err) => {
    console.error(
      "[StreamProxy] Upstream WebSocket error:",
      err.message
    );
  });
});

proxy.on("error", (err, req, res) => {
  console.error("[StreamProxy] Proxy error", {
    message: err.message,
    code: err.code,
    host: req?.headers?.host,
    url: req?.url,
  });

  // HTTP response
  if (res && typeof res.writeHead === "function") {
    if (!res.headersSent) {
      res.writeHead(502, {
        "Content-Type": "text/plain",
      });
    }

    res.end("Proxy error");
    return;
  }

  // WebSocket socket
  if (res && typeof res.destroy === "function") {
    res.destroy();
  }
});


export default router;