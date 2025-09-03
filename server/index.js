import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import passport from "passport";
import "./passportConfig.js"; // Import Passport Config
import authRoutes from "./routes/auth.js"; // Ensure the file extension is correct
import postRoutes from "./routes/postRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import gameRoutes from "./routes/gameRoutes.js"

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173","https://localhost:5173","https://xn--tlay-0ra.com"], // Adjust the origin as needed
    credentials: true, // Allow cookies to be sent
    methods: ["GET", "POST"],
  })
);

app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

app.use(cookieParser());
app.use(session({ secret: process.env.JWT_SECRET, resave: false, saveUninitialized: true }));
// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);

// Serve uploaded games statically
app.use("/uploads", express.static("uploads"));

// Upload route
app.use("/api/upload", uploadRoutes);
app.use("/api/gameRoutes",gameRoutes);
// Connect to MongoDB

mongoose
  .connect(process.env.MONGO_URI) // Removed the "!" here
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB Connection Error:", err));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
