import { Page } from "puppeteer";
import { BaseExtractionStrategy } from "./base.strategy";
import { PageData } from "@/interfaces";

/**
 * X 특화 전략
 * X 특화 로직 추가 (TODO)
 */
export class SnsXStrategy extends BaseExtractionStrategy {
  public async extract(
    page: Page,
    currentUrl: string
  ): Promise<PageData | null> {
    return null;
  }
}
