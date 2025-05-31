import * as dotenv from "dotenv";

dotenv.config();

export const config = {
  database: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306", 10),
    username: process.env.DB_USERNAME || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_DATABASE || "blockxen_crawler",
  },
  puppeteer: {
    maxConcurrency: parseInt(process.env.PUPPETEER_MAX_CONCURRENCY || "5", 10),
    timeoutMs: parseInt(process.env.PUPPETEER_TIMEOUT_MS || "30000", 10),
    headless: process.env.PUPPETEER_HEADLESS === "true",
    retryLimit: parseInt(process.env.PUPPETEER_RETRY_LIMIT || "2", 10),
    retryDelay: parseInt(process.env.PUPPETEER_RETRY_DELAY || "5000", 10),
    userAgent:
      process.env.PUPPETEER_USER_AGENT ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
  },
  crawler: {
    initialSeedDomains: (
      process.env.INITIAL_SEED_DOMAINS || "dcinside.com,fmkorea.com"
    ).split(","),
    initialSeedKeywords: (
      process.env.INITIAL_SEED_KEYWORDS || "프리섭,첫충,홍보채널"
    ).split(","),
    maxCrawlCycles: parseInt(process.env.CRAWLER_MAX_CYCLES || "1000", 10),
    searchDelayMs: parseInt(process.env.CRAWLER_SEARCH_DELAY_MS || "1000", 10),
    pageDelayMs: parseInt(process.env.CRAWLER_PAGE_DELAY_MS || "500", 10),
  },
  isDevelopment: process.env.NODE_ENV === "development",
};

export * from "./typeorm.config";
