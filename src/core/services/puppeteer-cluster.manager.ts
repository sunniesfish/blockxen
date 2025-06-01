import { Cluster } from "puppeteer-cluster";
import { Page, Browser } from "puppeteer";
import { config } from "@/config";
import { CrawlTask, PageData, SearchData } from "@/interfaces";
import { StrategyManager } from "./strategy.manager";
import { IExtractionStrategy } from "@/strategies/base.strategy";

// TaskFunction에 전달될 데이터 타입 정의
type ClusterTaskData = CrawlTask;

export class PuppeteerClusterManager {
  private cluster: Cluster<
    ClusterTaskData,
    PageData | SearchData[] | null
  > | null = null;
  private strategyManager: StrategyManager;

  constructor(strategyManager: StrategyManager) {
    this.strategyManager = strategyManager;
  }

  public async initialize(): Promise<void> {
    if (this.cluster) {
      console.log("Puppeteer cluster already initialized.");
      return;
    }

    this.cluster = await Cluster.launch({
      concurrency: Cluster.CONCURRENCY_CONTEXT, // 또는 CONCURRENCY_BROWSER, CONCURRENCY_PAGE
      maxConcurrency: config.puppeteer.maxConcurrency,
      puppeteerOptions: {
        headless: config.puppeteer.headless,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
        ],
        timeout: config.puppeteer.timeoutMs,
      },
      monitor: config.isDevelopment,
      workerCreationDelay: 100,
      retryLimit: config.puppeteer.retryLimit,
      retryDelay: config.puppeteer.retryDelay,
      timeout: config.puppeteer.timeoutMs * 2,
    });

    await this.cluster.task(
      async ({ page, data }: { page: Page; data: ClusterTaskData }) => {
        return this.handlePage(page, data);
      }
    );
  }

  /**
   * tasck 종류 (search, direct)에 따라 적절한 strategy 적용하여 크롤링 작업 수행
   * @param page
   * @param task
   * @returns Promise<PageData | null>
   */
  private async handlePage(
    page: Page,
    task: ClusterTaskData
  ): Promise<PageData | SearchData[] | null> {
    try {
      await page.setUserAgent(config.puppeteer.userAgent);
      await page.setViewport({ width: 1280, height: 800 });

      let currentUrlAfterNavigation: string;

      // 검색 작업
      if (task.domainToSearch && task.keywordToSearch) {
        const searchQuery = `site:${task.domainToSearch} "${task.keywordToSearch}"`;
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
        await page.goto(googleUrl, {
          waitUntil: "domcontentloaded",
          timeout: config.puppeteer.timeoutMs,
        });
        currentUrlAfterNavigation = page.url();

        // 직접 URL 방문 작업
      } else if (task.targetUrl) {
        await page.goto(task.targetUrl, {
          waitUntil: "domcontentloaded",
          timeout: config.puppeteer.timeoutMs,
        });
        currentUrlAfterNavigation = page.url();
      } else {
        throw new Error(
          "Invalid task: neither search parameters nor target URL provided"
        );
      }

      let strategy: IExtractionStrategy | null =
        this.strategyManager.getStrategy(task);

      return await strategy.extract(page, currentUrlAfterNavigation);
    } catch (error: any) {
      console.error(`Error processing task: ${error.message}`, error.stack);
      return null;
    }
  }

  public async queueTask(
    task: CrawlTask
  ): Promise<PageData | SearchData[] | null | undefined> {
    if (!this.cluster) {
      console.error("Cluster not initialized. Call initialize() first.");
      return undefined;
    }
    return this.cluster.execute(task as ClusterTaskData);
  }

  public async close(): Promise<void> {
    if (this.cluster) {
      await this.cluster.idle();
      await this.cluster.close();
      this.cluster = null;
    }
  }

  public getClusterInstance(): Cluster<
    ClusterTaskData,
    PageData | SearchData[] | null
  > | null {
    return this.cluster;
  }
}
