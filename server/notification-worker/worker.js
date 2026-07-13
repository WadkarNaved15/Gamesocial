import "../loadEnv.js";
import mongoose from "mongoose";
import { startSQSConsumer } from "./sqsConsumer.js";
import dns from "dns";

const startWorker = async () => {
  try {
    dns.setServers(["1.1.1.1", "8.8.8.8"]);
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Worker DB Connected");

    // ✅ Start consuming only after DB is ready
    startSQSConsumer();
  } catch (err) {
    console.error("❌ Worker Error:", err);
console.error(err.stack);
  }
};

startWorker();
