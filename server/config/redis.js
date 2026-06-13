import dotenv from "dotenv";
import { createClient } from "redis";

dotenv.config();

export const redisConfig = {
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

client.on("error", (err) =>
  console.error("❌ Redis Client Error:", err)
);

await client.connect();

console.log("✅ Connected to Redis");

export default client;