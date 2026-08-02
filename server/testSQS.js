import dotenv from "dotenv";
import { createClient } from "redis";

dotenv.config();

const redisConfig = {
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  username: "default",
  password: process.env.REDIS_PASSWORD,
};

const client = createClient({
  username: redisConfig.username,
  password: redisConfig.password,
  socket: {
    host: redisConfig.host,
    port: redisConfig.port,
    tls: false,
  },
});

client.on("error", (err) => console.error("❌ Redis Client Error:", err));

async function clearChatCache() {
  try {
    await client.connect();
    console.log("✅ Connected to Redis");

    // Fetch matching keys
    const keys = await client.keys("chat:messages:*");

    if (keys.length > 0) {
      await client.del(keys);
      console.log(`🧹 Successfully deleted ${keys.length} key(s).`);
    } else {
      console.log("ℹ️ No matching keys found to delete.");
    }
  } catch (error) {
    console.error("❌ Error clearing cache:", error);
  } finally {
    // Gracefully disconnect from Redis
    await client.disconnect();
    console.log("🔌 Disconnected from Redis");
  }
}

clearChatCache();