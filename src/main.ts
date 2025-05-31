import "reflect-metadata"; // TypeORM 사용에 필요
import { StorageService } from "./database/services/storage.service";
import { StrategyManager } from "./core/services/strategy.manager";
import { PuppeteerClusterManager } from "./core/services/puppeteer-cluster.manager";
import { DataProcessorService } from "./core/services/data-processor.service";
import { CrawlerSchedulerService } from "./core/services/crawler-scheduler.service";

let schedulerServiceInstance: CrawlerSchedulerService | null = null;
let puppeteerManagerInstance: PuppeteerClusterManager | null = null;
let storageServiceInstance: StorageService | null = null;

async function bootstrap(): Promise<void> {
  const storageService = new StorageService();
  const strategyManager = new StrategyManager();
  const dataProcessorService = new DataProcessorService(storageService);
  const puppeteerManager = new PuppeteerClusterManager(strategyManager);
  const schedulerService = new CrawlerSchedulerService(
    storageService,
    puppeteerManager,
    dataProcessorService
  );

  storageServiceInstance = storageService;
  puppeteerManagerInstance = puppeteerManager;
  schedulerServiceInstance = schedulerService;

  try {
    await storageService.initialize();

    await puppeteerManager.initialize();

    await schedulerService.startCrawling();
  } catch (error: any) {
    console.error(
      "Unhandled error during application execution:",
      error.message,
      error.stack
    );
    if (puppeteerManagerInstance) await puppeteerManagerInstance.close();
    if (storageServiceInstance) await storageServiceInstance.disconnect();
    process.exit(1);
  } finally {
    if (
      schedulerServiceInstance &&
      schedulerServiceInstance.getIsCrawlingState()
    ) {
      schedulerServiceInstance.stopCrawling();
      schedulerServiceInstance = null;
    }
  }
}

bootstrap().catch((error) => {
  process.exit(1);
});

async function shutdownGracefully(): Promise<void> {
  if (schedulerServiceInstance) {
    schedulerServiceInstance.stopCrawling();
    schedulerServiceInstance = null;
  }
  if (puppeteerManagerInstance) {
    await puppeteerManagerInstance.close();
  }
  if (storageServiceInstance) {
    await storageServiceInstance.disconnect();
  }
  process.exit(0);
}

process.on("SIGINT", async () => {
  await shutdownGracefully();
});

process.on("SIGTERM", async () => {
  await shutdownGracefully();
});
