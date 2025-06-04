import { Page } from "puppeteer";
import { IExtractionStrategy, PageData, SearchData } from "@/interfaces";

/**
 * 기본 추출 전략
 */
export abstract class BaseExtractionStrategy implements IExtractionStrategy {
  public abstract extract(
    page: Page,
    currentUrl: string
  ): Promise<PageData | SearchData[] | null>;

  protected async extractAllLinks(page: Page): Promise<string[]> {
    try {
      const links = await page.$$eval("a", (anchors: HTMLAnchorElement[]) =>
        anchors
          .map((anchor: HTMLAnchorElement) => anchor.href)
          .filter((href) => !!href)
      );
      return links.map((link: string) => {
        try {
          return new URL(link, page.url()).href;
        } catch (e) {
          return link;
        }
      });
    } catch (error) {
      console.error("Error extracting links:", error);
      return [];
    }
  }

  protected async extractBodyText(page: Page): Promise<string> {
    try {
      return await page.$eval("body", (body: HTMLElement) => body.innerText);
    } catch (error) {
      console.error("Error extracting body text:", error);
      return "";
    }
  }
}
