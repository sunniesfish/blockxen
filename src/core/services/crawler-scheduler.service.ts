import { Queue } from "./utils/queue";
import { config } from "@/config";
import { StorageService } from "@/database/services/storage.service";
import { PuppeteerClusterManager } from "./puppeteer-cluster.manager";
import { DataProcessorService, ProcessedData } from "./data-processor.service";
import { CrawlTask, PageData } from "@/interfaces";
import { normalizeDomain, getBaseDomain } from "@/common/utils";
import {
  TargetSiteEntity,
  SiteType,
} from "@/database/entities/target-site.entity";

export class CrawlerSchedulerService {
  private Q1_communityDomains: Queue<string>;
  private K1_keywords: Set<string>;
  private R1_domainKeywordMap: Map<string, Set<string>>;
  private R2_discoveredTargetDomains: Set<string>;
  private S1_searchResultLinks: Queue<string>;

  private readonly storageService: StorageService;
  private readonly puppeteerManager: PuppeteerClusterManager;
  private readonly dataProcessor: DataProcessorService;

  private isCrawling: boolean = false;
  private maxCrawlCycles: number = config.crawler.maxCrawlCycles || 1000;
  private currentCrawlCycle: number = 0;
  private searchDelayMs: number = config.crawler.searchDelayMs || 1000;
  private pageDelayMs: number = config.crawler.pageDelayMs || 500;

  constructor(
    storageService: StorageService,
    puppeteerManager: PuppeteerClusterManager,
    dataProcessor: DataProcessorService
  ) {
    this.storageService = storageService;
    this.puppeteerManager = puppeteerManager;
    this.dataProcessor = dataProcessor;

    this.Q1_communityDomains = new Queue<string>();
    this.K1_keywords = new Set<string>();
    this.R1_domainKeywordMap = new Map<string, Set<string>>();
    this.R2_discoveredTargetDomains = new Set<string>();
    this.S1_searchResultLinks = new Queue<string>();
  }

  private async initializeDataStructures(): Promise<void> {
    config.crawler.initialSeedDomains.forEach((domain: string) => {
      if (domain && domain.trim() !== "") {
        this.Q1_communityDomains.enqueue(normalizeDomain(domain.trim()));
      }
    });
    config.crawler.initialSeedKeywords.forEach((keyword: string) => {
      if (keyword && keyword.trim() !== "") {
        this.K1_keywords.add(keyword.trim());
      }
    });

    try {
      const existingTargetDomains =
        await this.storageService.getAllTargetNormalizedDomains();
      existingTargetDomains.forEach((domain: string) =>
        this.R2_discoveredTargetDomains.add(domain)
      );
    } catch (error) {
      console.error("Failed to load existing target domains for R2:", error);
    }
  }

  /**
   * 1번의 루프마다
   * - communityDomains 큐에서 1개 진행
   * - searchResultLinks 큐 전부 진행
   * - 새로운 키워드 조합을 적용하여 크롤링 재시작 여부 결정
   *
   */
  public async startCrawling(): Promise<void> {
    if (this.isCrawling) {
      console.warn("Crawling is already in progress.");
      return;
    }
    this.isCrawling = true;
    this.currentCrawlCycle = 0;

    await this.initializeDataStructures();

    try {
      while (this.isCrawling && this.currentCrawlCycle < this.maxCrawlCycles) {
        this.currentCrawlCycle++;

        let q1Processed = false;
        if (!this.Q1_communityDomains.isEmpty()) {
          await this.processQ1_communityDomains();
          q1Processed = true;
        }

        let s1Processed = false;
        if (!this.S1_searchResultLinks.isEmpty()) {
          await this.processS1_searchResultLinks();
          s1Processed = true;
        }

        if (!q1Processed && !s1Processed) {
          if (await this.checkAndPrepareForRestart()) {
          } else {
            this.isCrawling = false;
          }
        }

        if (!this.isCrawling) {
          break;
        }
      }
    } catch (error) {
      console.error("Error during crawling process:", error);
    } finally {
      this.isCrawling = false;
    }
  }

  /**
   * 커뮤니티 도메인 큐에서 도메인을 가져와
   * 키워드를 순차적으로 적용하여 검색 페이지 크롤링
   * 각 키워드에 대한 검색 결과에서 추출된 링크들을 S1 큐에 추가
   * 검색한 키워드를 R1에 저장
   */
  private async processQ1_communityDomains(): Promise<void> {
    const domainToCrawl = this.Q1_communityDomains.dequeue();
    if (!domainToCrawl) return;

    this.R1_domainKeywordMap.set(
      domainToCrawl,
      this.R1_domainKeywordMap.get(domainToCrawl) || new Set<string>()
    );
    const appliedKeywordsToDomain =
      this.R1_domainKeywordMap.get(domainToCrawl)!;

    for (const keyword of Array.from(this.K1_keywords)) {
      if (!this.isCrawling) break;
      if (appliedKeywordsToDomain.has(keyword)) continue;

      const searchTask: CrawlTask = {
        domainToSearch: domainToCrawl,
        keywordToSearch: keyword,
        strategyHint: "search-result-page",
      };

      const searchPageData: PageData | null | undefined =
        await this.puppeteerManager.queueTask(searchTask);
      appliedKeywordsToDomain.add(keyword);

      if (searchPageData && searchPageData.extractedLinks) {
        searchPageData.extractedLinks.forEach((link: string) => {
          if (link && getBaseDomain(link) === domainToCrawl) {
            this.S1_searchResultLinks.enqueue(link);
          }
        });
      }
      if (this.searchDelayMs > 0) await this.delay(this.searchDelayMs);
    }
  }

  /**
   * S1 큐에서 링크를 가져와 커뮤니티 사이트 크롤링
   * 커뮤니티 사이트에서 추출된 데이터를 처리
   *
   */
  private async processS1_searchResultLinks(): Promise<void> {
    while (!this.S1_searchResultLinks.isEmpty()) {
      const urlToExplore = this.S1_searchResultLinks.dequeue();
      if (!urlToExplore || !this.isCrawling) return;

      // urlToExplore의 형태를 체크하는 로직 필요 -> strategyHint 결정
      const pageTask: CrawlTask = {
        targetUrl: urlToExplore,
        strategyHint: "community-site",
      };
      const exploredPageData: PageData | null | undefined =
        await this.puppeteerManager.queueTask(pageTask);

      if (exploredPageData) {
        await this.processExploredData(exploredPageData, urlToExplore);
      }
      if (this.pageDelayMs > 0) await this.delay(this.pageDelayMs);
    }
  }

  /**
   * 탐색된 페이지 데이터를 처리
   *
   * 체크포인트 : 각각의 수집 데이터 parsing이 적절한지 확인 필요
   */
  private async processExploredData(
    pageData: PageData,
    sourceUrl: string
  ): Promise<void> {
    const processedResult: ProcessedData =
      await this.dataProcessor.processPageData(pageData, sourceUrl);

    // 수집한 새 커뮤니티 도메인 큐 처리
    processedResult.newCommunityDomains.forEach((domain: string) => {
      const normDomain = normalizeDomain(domain.trim());
      if (
        normDomain &&
        !this.R1_domainKeywordMap.has(normDomain) &&
        // toArray가 무겁지 않을까? queue.ts 수정 필요할 수도
        !this.Q1_communityDomains.toArray().includes(normDomain)
      ) {
        this.Q1_communityDomains.enqueue(normDomain);
      }
    });

    // 수집한 새 타겟 사이트 처리
    for (const site of processedResult.newTargetSites) {
      const normDomain = site.normalizedDomain;
      if (normDomain && !this.R2_discoveredTargetDomains.has(normDomain)) {
        const siteDataFromProcessor = site;

        const dataForDb: {
          url: string;
          normalizedDomain: string;
          siteType: SiteType;
          siteName?: string;
          sourceUrl?: string;
        } = {
          url: siteDataFromProcessor.url,
          normalizedDomain: siteDataFromProcessor.normalizedDomain,
          siteType: siteDataFromProcessor.siteType,
          siteName: siteDataFromProcessor.siteName ?? undefined,
          sourceUrl: siteDataFromProcessor.sourceUrl ?? undefined,
        };

        try {
          const savedSite = await this.storageService.saveTargetSite(dataForDb);
          if (savedSite) {
            this.R2_discoveredTargetDomains.add(normDomain);

            if (dataForDb.siteName && dataForDb.siteName !== normDomain) {
              this.K1_keywords.add(dataForDb.siteName.trim());
            }
            const domainPartForKeyword = normDomain.split(".")[0];
            if (domainPartForKeyword)
              this.K1_keywords.add(domainPartForKeyword);
          }
        } catch (dbError) {
          console.error(
            `    => [NEW TARGET] Error saving to DB ${dataForDb.url}:`,
            dbError
          );
        }
      }
    }

    // 수집한 새 키워드 처리
    const initialK1Size = this.K1_keywords.size;
    processedResult.newKeywords.forEach((keyword: string) => {
      const trimmedKeyword = keyword.trim();
      if (trimmedKeyword && trimmedKeyword.length > 1) {
        this.K1_keywords.add(trimmedKeyword);
      }
    });
  }

  /**
   * 새로운 키워드 조합에 대해 재 크롤링 진행 여부 결정
   *
   * 체크포인트 : 한 커뮤니티에 대한 재귀탐색 횟수 제한 추가 필요
   */
  private async checkAndPrepareForRestart(): Promise<boolean> {
    let newKeywordCombinationsFound = false;
    for (const domain of this.R1_domainKeywordMap.keys()) {
      if (!this.isCrawling) break;
      const appliedKeywords = this.R1_domainKeywordMap.get(domain)!;
      const k1Array = Array.from(this.K1_keywords);
      const newKeywordsForThisDomain = k1Array.filter(
        (k) => !appliedKeywords.has(k)
      );

      if (newKeywordsForThisDomain.length > 0) {
        if (!this.Q1_communityDomains.toArray().includes(domain)) {
          this.Q1_communityDomains.enqueue(domain);
          newKeywordCombinationsFound = true;
        }
      }
    }
    return newKeywordCombinationsFound;
  }

  public stopCrawling(): void {
    this.isCrawling = false;
  }

  public getIsCrawlingState(): boolean {
    return this.isCrawling;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
