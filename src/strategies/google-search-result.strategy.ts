import { Page } from "puppeteer";
import { BaseExtractionStrategy } from "./base.strategy";
import { IExtractionStrategy, SearchData, strategyHint } from "@/interfaces";
import { normalizeDomain } from "@/common/utils";

/**
 * 구글검색 결과 페이지에서 실제 검색 결과 링크들을 추출
 */
export class GoogleSearchResultStrategy
  extends BaseExtractionStrategy
  implements IExtractionStrategy
{
  private readonly keywords: string[];

  constructor(keywords: string[]) {
    super();
    this.keywords = keywords;
  }

  public async extract(page: Page, url: string): Promise<SearchData[]> {
    try {
      return await this.extractGoogleSearchResults(page);
    } catch (error) {
      console.error("Google Search Result Strategy Error:", error);
      return [];
    }
  }

  /**
   * Google 검색 결과에서 적절한 링크만 추출
   */
  private async extractGoogleSearchResults(page: Page): Promise<SearchData[]> {
    const strategyHint = this.getStrategyHint(page.url());
    return await page.evaluate(() => {
      const results: SearchData[] = [];

      const allLinks = document.querySelectorAll("a");

      allLinks.forEach((link) => {
        let shouldSkip = true;
        try {
          const titleElement = link.querySelector("h3");
          if (!titleElement || !link.href) {
            return;
          }

          const href = link.href;
          const title = titleElement.textContent?.trim() || "";
          if (this.keywords.some((keyword) => title.includes(keyword))) {
            shouldSkip = false;
          }
          if (
            href.includes("google.") ||
            href.startsWith("/search") ||
            href.startsWith("#")
          ) {
            return;
          }

          let currentElement: Element | null = link;
          let depth = 0;
          while (
            currentElement &&
            currentElement !== document.body &&
            depth < 8
          ) {
            const highlightElement =
              currentElement.querySelector("em, b") ||
              currentElement.parentElement?.querySelector("em, b");

            if (highlightElement) {
              const textContainer = highlightElement.parentElement;
              if (textContainer) {
                const descText = textContainer.textContent?.trim() || "";
                if (
                  this.keywords.some((keyword) => descText.includes(keyword))
                ) {
                  shouldSkip = false;
                  break;
                }
              }
            }
            currentElement = currentElement.parentElement;
            depth++;
          }

          if (shouldSkip) {
            return;
          }

          // 6. 객체로 만들어 배열에 넣음
          results.push({
            link: href,
            strategyHint: strategyHint,
          });
        } catch (error) {
          console.error("링크 처리 중 오류:", error);
        }
      });

      return results;
    });
  }

  getStrategyHint(urlString: string): strategyHint {
    const domain = normalizeDomain(urlString);
    if (domain.includes("x.com")) {
      return "sns-x";
    }
    if (domain.includes("youtube.com")) {
      return "sns-youtube";
    }
    if (domain.includes("/board/") || domain.includes("/bbs/")) {
      return "community-site";
    }
    return "unknown";
  }
}
