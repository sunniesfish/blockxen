import { Queue } from "./utils/queue";
import { config } from "@/config";
import { StorageService } from "@/database/services/storage.service";
import { PuppeteerClusterManager } from "./puppeteer-cluster.manager";
import { DataProcessorService } from "./data-processor.service";
import {
  CrawlTask,
  PageData,
  SearchData,
  strategyHint,
  SiteType,
  ProcessedData,
  DomainMetadata,
} from "@/interfaces";
import { normalizeDomain } from "@/common/utils";
import AsyncLock from "./utils/async-lock";

/**
 * 크롤링 스케줄러 서비스
 * 크롤링 작업을 조정하고 관리
 */
export class CrawlerSchedulerService {
  private Q1_communityDomains: Queue<string>;
  private Q1_communityDomainsSet: Set<string>;
  private Q1_communityDomainsMetadata: Map<string, DomainMetadata>;
  private K1_keywords: Set<string>;
  private R1_domainKeywordMap: Map<string, Set<string>>;
  private R2_discoveredTargetDomains: Set<string>;
  private S1_searchResultData: Queue<SearchData>;

  private readonly storageService: StorageService;
  private readonly puppeteerManager: PuppeteerClusterManager;
  private readonly dataProcessor: DataProcessorService;

  private queueLock = new AsyncLock();
  private sharedDataLock = new AsyncLock();

  private isCrawling: boolean = false;
  private maxCrawlCycles: number = config.crawler.maxCrawlCycles || 1000;
  private currentCrawlCycle: number = 0;
  private searchDelayMs: number = config.crawler.searchDelayMs || 1000;

  constructor(
    storageService: StorageService,
    puppeteerManager: PuppeteerClusterManager,
    dataProcessor: DataProcessorService
  ) {
    this.storageService = storageService;
    this.puppeteerManager = puppeteerManager;
    this.dataProcessor = dataProcessor;

    this.Q1_communityDomains = new Queue<string>();
    this.Q1_communityDomainsSet = new Set<string>();
    this.Q1_communityDomainsMetadata = new Map<string, DomainMetadata>();
    this.K1_keywords = new Set<string>();
    this.R1_domainKeywordMap = new Map<string, Set<string>>();
    this.R2_discoveredTargetDomains = new Set<string>();
    this.S1_searchResultData = new Queue<SearchData>();
  }

  private async initializeDataStructures(): Promise<void> {
    config.crawler.initialSeedDomains.forEach((domain: string) => {
      if (domain && domain.trim() !== "") {
        this.Q1_communityDomains.enqueue(normalizeDomain(domain.trim()));
        this.Q1_communityDomainsSet.add(normalizeDomain(domain.trim()));
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
   * - communityDomains 큐가 비었을 경우 새로운 키워드 조합을 적용하여 크롤링 재시작 여부 결정
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

        if (!this.Q1_communityDomains.isEmpty()) {
          await this.processQ1_communityDomains();
        }

        if (!this.S1_searchResultData.isEmpty()) {
          await this.processS1_searchResultLinks();
        }

        if (this.Q1_communityDomains.isEmpty()) {
          if (!(await this.checkAndPrepareForRestart())) {
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
   * communityDomains 큐에서 도메인을 가져와
   * 키워드를 순차적으로 적용하여 검색 페이지 크롤링
   * 각 키워드에 대한 검색 결과에서 추출된 링크들을 searchResultData 큐에 추가
   * 검색 완료한 도메인-키워드 조합 domainToKeywordMap 맵에 기록
   */
  private async processQ1_communityDomains(): Promise<void> {
    if (this.Q1_communityDomains.isEmpty()) return;
    const domainToCrawl = this.Q1_communityDomains.dequeue();
    if (!domainToCrawl) return;

    if (this.Q1_communityDomainsSet.has(domainToCrawl)) {
      this.Q1_communityDomainsSet.delete(domainToCrawl);
    } else {
      return;
    }

    if (!this.R1_domainKeywordMap.has(domainToCrawl)) {
      this.R1_domainKeywordMap.set(domainToCrawl, new Set<string>());
    }

    if (!this.Q1_communityDomainsMetadata.has(domainToCrawl)) {
      this.Q1_communityDomainsMetadata.set(domainToCrawl, {
        retryCount: 0,
        keywordCount: this.K1_keywords.size,
      });
    }

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

      const searchPageData = await this.puppeteerManager.queueTask(searchTask);

      if (searchPageData) {
        appliedKeywordsToDomain.add(keyword);
        if (Array.isArray(searchPageData)) {
          searchPageData.forEach(
            (data: { link: string; strategyHint: strategyHint }) => {
              if (data.link && normalizeDomain(data.link) === domainToCrawl) {
                this.S1_searchResultData.enqueue(data);
              }
            }
          );
        } else {
          continue;
        }
        if (this.searchDelayMs > 0) await this.delay(this.searchDelayMs);
      }
    }
  }

  /**
   * S1 검색 결과 링크들을 batch 단위로 끊어서 병렬처리
   */
  private async processS1_searchResultLinks(): Promise<void> {
    const batchSize = config.puppeteer.maxConcurrency;

    while (!this.S1_searchResultData.isEmpty()) {
      // 배치 단위로 데이터 추출
      const batch = await this.dequeueBatch(batchSize);
      if (batch.length === 0) break;

      // 병렬 크롤링 실행
      const crawlingPromises = batch.map(async (searchResultData) => {
        try {
          const pageTask: CrawlTask = {
            targetUrl: searchResultData.link,
            strategyHint: searchResultData.strategyHint,
          };
          const pageData = await this.puppeteerManager.queueTask(pageTask);

          if (pageData && !Array.isArray(pageData)) {
            return await this.processExploredDataLocal(
              pageData,
              searchResultData.link
            );
          }
        } catch (error) {
          console.error(
            `크롤링 실패: ${searchResultData.link}`,
            error instanceof Error ? error.stack : String(error)
          );
        }
        return null;
      });

      // 모든 크롤링 완료 대기
      const results = await Promise.allSettled(crawlingPromises);

      // 성공한 결과만 수집
      const successfulResults: ProcessedData[] = [];
      results.forEach((result) => {
        if (result.status === "fulfilled" && result.value !== null) {
          successfulResults.push(result.value);
        }
      });

      // 배치 결과를 공유 자료구조에 병합
      if (successfulResults.length > 0) {
        await this.mergeBatchResults(successfulResults);
      }
    }
  }

  /**
   * 새로운 키워드 조합에 대해 재 크롤링 진행 여부 결정
   * 새로운 키워드 조합이 있는 경우 communityDomains 큐에 추가 후 크롤링 재시작
   */
  private async checkAndPrepareForRestart(): Promise<boolean> {
    let shouldRestart = false;
    for (const domain of this.R1_domainKeywordMap.keys()) {
      if (!this.isCrawling) break;

      const metadata = this.Q1_communityDomainsMetadata.get(domain);
      if (!metadata) continue;

      if (
        metadata.retryCount <= 3 &&
        metadata.keywordCount <= config.crawler.domainDiscoveryLimit
      ) {
        // 해당 도메인에 대해 이미 적용한 키워드 조합 집합 가져옴
        const appliedKeywords = this.R1_domainKeywordMap.get(domain)!;

        // 모든 키워드 조합 배열로 변환
        const k1Array = Array.from(this.K1_keywords);

        // 이미 적용한 키워드 조합 제외한 새로운 키워드 조합 배열 생성
        const newKeywordsForThisDomain = k1Array.filter(
          (k) => !appliedKeywords.has(k)
        );
        // 새로운 키워드 조합이 있는 경우
        if (newKeywordsForThisDomain.length > 0) {
          // 해당 도메인이 커뮤니티 도메인 큐에 없는 경우
          if (!this.Q1_communityDomainsSet.has(domain)) {
            // 메타데이터 업데이트 후 커뮤니티 도메인 큐에 추가
            shouldRestart = true;
            metadata.retryCount++;
            metadata.keywordCount =
              metadata.keywordCount + newKeywordsForThisDomain.length;
            this.Q1_communityDomains.enqueue(domain);
            this.Q1_communityDomainsSet.add(domain);
          }
        }
      }
    }
    return shouldRestart;
  }

  /**
   * 크롤링 지연시간 제공
   * @param ms 지연 시간
   * @returns 지연 메서드
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public stopCrawling(): void {
    this.isCrawling = false;
  }

  public getIsCrawlingState(): boolean {
    return this.isCrawling;
  }

  /**
   * S1 큐에서 배치 크기만큼 데이터를 안전하게 추출
   */
  private async dequeueBatch(batchSize: number): Promise<SearchData[]> {
    const release = await this.queueLock.acquire();
    try {
      const batch: SearchData[] = [];
      while (!this.S1_searchResultData.isEmpty() && batch.length < batchSize) {
        const data = this.S1_searchResultData.dequeue();
        if (data) {
          batch.push(data);
        }
      }
      return batch;
    } finally {
      release();
    }
  }

  /**
   * 크롤링 결과 데이터를 로컬에서 처리 (공유 자료구조 접근 없음)
   */
  private async processExploredDataLocal(
    pageData: PageData,
    sourceUrl: string
  ): Promise<ProcessedData> {
    return await this.dataProcessor.processPageData(pageData, sourceUrl);
  }

  /**
   * 배치 처리 결과를 공유 자료구조에 병합
   */
  private async mergeBatchResults(
    batchResults: ProcessedData[]
  ): Promise<void> {
    const release = await this.sharedDataLock.acquire();
    try {
      for (const processedResult of batchResults) {
        // 수집한 새 커뮤니티 도메인 큐 처리
        processedResult.newCommunityDomains.forEach((domain: string) => {
          const normDomain = normalizeDomain(domain.trim());
          if (
            normDomain &&
            !this.R1_domainKeywordMap.has(normDomain) &&
            !this.Q1_communityDomainsSet.has(normDomain)
          ) {
            this.Q1_communityDomainsSet.add(normDomain);
            this.Q1_communityDomains.enqueue(normDomain);
          }
        });

        // 수집한 새 타겟 사이트 처리
        for (const site of processedResult.newTargetSites) {
          const normDomain = site.normalizedDomain;
          if (normDomain && !this.R2_discoveredTargetDomains.has(normDomain)) {
            const dataForDb: {
              url: string;
              normalizedDomain: string;
              siteType: SiteType;
              siteName?: string;
              sourceUrl?: string;
            } = {
              url: site.url,
              normalizedDomain: site.normalizedDomain,
              siteType: site.siteType,
              siteName: site.siteName ?? undefined,
              sourceUrl: site.sourceUrl ?? undefined,
            };

            void this.storageService.saveTargetSite(dataForDb);

            if (dataForDb) {
              this.R2_discoveredTargetDomains.add(normDomain);

              if (dataForDb.siteName && dataForDb.siteName !== normDomain) {
                this.K1_keywords.add(dataForDb.siteName.trim());
              }
              const domainPartForKeyword = normDomain.split(".")[0];
              if (domainPartForKeyword)
                this.K1_keywords.add(domainPartForKeyword);
            }
          }
        }

        // 수집한 새 키워드 처리
        processedResult.newKeywords.forEach((keyword: string) => {
          const trimmedKeyword = keyword.trim();
          if (trimmedKeyword && trimmedKeyword.length > 1) {
            this.K1_keywords.add(trimmedKeyword);
          }
        });
      }
    } finally {
      release();
    }
  }
}
