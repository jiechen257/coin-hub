import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  APP_PASSWORD: z.string().min(1),
});

/**
 * 读取运行时环境变量。
 * 单用户密码必须由部署或本地环境显式提供。
 */
export function getEnv() {
  const parsed = envSchema.safeParse({
    APP_PASSWORD: process.env.APP_PASSWORD,
  });

  if (!parsed.success) {
    throw new Error("APP_PASSWORD is required");
  }

  return parsed.data;
}
