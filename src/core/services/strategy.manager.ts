import { BaseExtractionStrategy } from "@/strategies/base.strategy";
import { CommunitySiteStrategy } from "@/strategies/community-site.strategy";
import { Page } from "puppeteer";
import {
  PageData,
  CrawlTask,
  strategyHint,
  IExtractionStrategy,
} from "@/interfaces";
import { GoogleSearchResultStrategy } from "@/strategies/google-search-result.strategy";
import { config } from "@/config";

/**
 * 전략 관리
 * 크롤링 작업에 적합한 전략을 관리하고 제공
 */
export class StrategyManager {
  private strategyMap: Map<strategyHint, IExtractionStrategy>;

  constructor() {
    this.strategyMap = new Map<strategyHint, IExtractionStrategy>();

    this.strategyMap.set("community-site", new CommunitySiteStrategy());
    // this.strategyMap.set("target-site", new TargetSiteStrategy());
    // this.strategyMap.set("advertising-site", new AdvertisingSiteStrategy());
    // this.strategyMap.set("sns-x", new SnsXStrategy());
    // this.strategyMap.set("sns-youtube", new SnsYoutubeStrategy());
    this.strategyMap.set(
      "search-result-page",
      new GoogleSearchResultStrategy(config.strategy.searchKeywords)
    );
    // this.strategyMap.set("unknown", new GenericStrategy());
  }

  /**
   * 주어진 URL 또는 작업 정보에 가장 적합한 추출 전략을 반환
   * @param task 작업 정보
   * @returns 적합한 IExtractionStrategy
   */
  public getStrategy(strategyHint: strategyHint): IExtractionStrategy {
    switch (strategyHint) {
      case "search-result-page":
        return this.strategyMap.get("search-result-page")!;
      case "community-site":
        return this.strategyMap.get("community-site")!;
      case "sns-x":
        return this.strategyMap.get("sns-x")!;
      case "sns-youtube":
        return this.strategyMap.get("sns-youtube")!;
      default:
        return this.strategyMap.get("unknown")!;
    }
  }
}
