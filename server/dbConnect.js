import dns from 'dns';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix Windows Node.js SRV lookup issues on ISP/local routers
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

let isConnected = false;

export async function connectToMongoDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri || !uri.trim()) {
    console.warn("⚠️  MONGODB_URI is not configured in .env. Running with local fallback storage.");
    return false;
  }

  if (isConnected) {
    return true;
  }

  try {
    const conn = await mongoose.connect(uri);
    isConnected = true;
    console.log(`✅ MongoDB Connected Successfully: ${conn.connection.host}/${conn.connection.name}`);
    return true;
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error.message);
    return false;
  }
}

export function isMongoDBConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}
