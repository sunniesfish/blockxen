import {
  IExtractionStrategy,
  BaseExtractionStrategy,
} from "@/strategies/base.strategy";
import { CommunitySiteStrategy } from "@/strategies/community-site.strategy";
import { Page } from "puppeteer";
import { PageData, CrawlTask } from "@/interfaces";
import { GoogleSearchResultStrategy } from "@/strategies/google-search-result.strategy";
// import { BlogStrategy } from '@/strategies/blog.strategy'; // 예시
// import { YoutubeStrategy } from '@/strategies/youtube.strategy'; // 예시

export class StrategyManager {
  private strategies: IExtractionStrategy[];
  private googleSearchResultStrategy: GoogleSearchResultStrategy;
  private defaultStrategy: BaseExtractionStrategy;

  constructor() {
    this.googleSearchResultStrategy = new GoogleSearchResultStrategy();
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
      public override isApplicable(url: string): boolean {
        return true; // 이 전략은 모든 URL에 적용 가능 (최후의 보루)
      }
    }
    this.defaultStrategy = new GenericStrategy();

    this.strategies = [
      new CommunitySiteStrategy(),
      // 다른 특정 전략들을 여기에 추가
      this.defaultStrategy, // 가장 마지막에 기본 전략 추가
    ];
  }

  /**
   * 주어진 URL 또는 작업 정보에 가장 적합한 추출 전략을 반환
   * @param url 대상 URL
   * @param task 작업 정보 (선택적)
   * @returns 적합한 IExtractionStrategy
   */
  public getStrategy(url: string, task?: CrawlTask): IExtractionStrategy {
    // 특정 작업 힌트가 있다면 우선적으로 처리
    if (
      task?.strategyHint === "search-result-page" ||
      url.includes("google.com/search")
    ) {
      return this.googleSearchResultStrategy;

      // 특정 작업 힌트 처리 필요
    } else if (task?.strategyHint === "strategy-hint-needed") {
      // strategyHint 처리 필요
    }

    for (const strategy of this.strategies) {
      // defaultStrategy는 isApplicable=true 이므로, 가장 마지막에 매치됨
      if (strategy.isApplicable(url)) {
        return strategy;
      }
    }
    return this.defaultStrategy;
  }
}
