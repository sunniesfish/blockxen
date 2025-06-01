import {
  IExtractionStrategy,
  BaseExtractionStrategy,
} from "@/strategies/base.strategy";
import { CommunitySiteStrategy } from "@/strategies/community-site.strategy";
import { Page } from "puppeteer";
import { PageData, CrawlTask, strategyHint } from "@/interfaces";
import { GoogleSearchResultStrategy } from "@/strategies/google-search-result.strategy";

export class StrategyManager {
  private strategyMap: Map<strategyHint, IExtractionStrategy>;

  constructor() {
    this.strategyMap = new Map<strategyHint, IExtractionStrategy>();
    // GenericStrategy를 StrategyManager 내부 클래스 또는 별도 파일로 분리 가능
    class GenericStrategy extends BaseExtractionStrategy {
      public async extract(
        page: Page,
        currentUrl: string
      ): Promise<PageData | null> {
        const html = await page.content();
        const links = await this.extractAllLinks(page);
        const text = await this.extractBodyText(page);
        return {
          url: currentUrl,
          htmlContent: html,
          extractedLinks: links,
          extractedText: [text],
          strategyUsed: this.constructor.name,
        };
      }
    }

    this.strategyMap.set("community-site", new CommunitySiteStrategy());
    // this.strategyMap.set("target-site", new TargetSiteStrategy());
    // this.strategyMap.set("advertising-site", new AdvertisingSiteStrategy());
    // this.strategyMap.set("sns-x", new SnsXStrategy());
    // this.strategyMap.set("sns-youtube", new SnsYoutubeStrategy());
    this.strategyMap.set(
      "search-result-page",
      new GoogleSearchResultStrategy()
    );
    this.strategyMap.set("unknown", new GenericStrategy());
  }

  /**
   * 주어진 URL 또는 작업 정보에 가장 적합한 추출 전략을 반환
   * @param url 대상 URL
   * @param task 작업 정보 (선택적)
   * @returns 적합한 IExtractionStrategy
   */
  public getStrategy(task: CrawlTask): IExtractionStrategy {
    switch (task.strategyHint) {
      case "search-result-page":
        return this.strategyMap.get("search-result-page")!;
      case "community-site":
        return this.strategyMap.get("community-site")!;
      case "advertising-site":
        return this.strategyMap.get("advertising-site")!;
      case "sns-x":
        return this.strategyMap.get("sns-x")!;
      case "sns-youtube":
        return this.strategyMap.get("sns-youtube")!;
      default:
        return this.strategyMap.get("unknown")!;
    }
  }
}
