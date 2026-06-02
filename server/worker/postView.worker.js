import "dotenv/config";
import mongoose from "mongoose";
import { startViewSQSConsumer } from "./postViewConsumer.js";
import dns from "dns";

const startWorker = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not set");
    }

    dns.setServers(["1.1.1.1", "8.8.8.8"]);

    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected for view worker");

    await startViewSQSConsumer();
  } catch (err) {
    console.error("❌ View worker startup error:", err);
    process.exit(1);
  }
};

startWorker();