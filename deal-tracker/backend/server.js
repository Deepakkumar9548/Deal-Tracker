const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");

const rateLimit = require("express-rate-limit");
const logger = require("./utils/logger");
const { updateStats, getStats } = require("./utils/monitorStore");

dotenv.config();
connectDB();

const app = express();

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later."
});

// Apply rate limiter to all API routes
app.use("/api/", apiLimiter);

// middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Production Logging & Monitoring Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    updateStats(req.method, req.originalUrl, duration, res.statusCode);
    
    if (res.statusCode >= 400) {
      logger.error(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    } else {
      logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    }
  });
  next();
});

// SSE for Real-Time Monitoring
app.get("/api/monitor/stream", (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const interval = setInterval(() => {
    const stats = getStats();
    res.write(`data: ${JSON.stringify(stats)}\n\n`);
  }, 2000); // Send updates every 2 seconds

  req.on('close', () => clearInterval(interval));
});

// routes
app.use("/api/deals", require("./routes/dealRoutes"));

// Serve uploaded files statically so they can be accessed by the frontend via /uploads/filename
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Serve static frontend files
app.use(express.static(path.join(__dirname, "../frontend")));

// Any route not caught by API will serve the frontend index.html
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT} 🚀`);
});