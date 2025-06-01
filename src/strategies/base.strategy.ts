import { Page } from "puppeteer";
import { IExtractionStrategy, PageData, SearchData } from "@/interfaces";

/**
 * 기본 추출 전략 (모든 링크와 텍스트를 단순 추출)
 */
export abstract class BaseExtractionStrategy implements IExtractionStrategy {
  public abstract extract(
    page: Page,
    currentUrl: string
  ): Promise<PageData | SearchData[] | null>;

  /**
   * 페이지에서 모든 <a> 태그의 href 속성을 추출합니다.
   * @param page Puppeteer Page 객체
   * @returns 추출된 URL 배열
   */
  protected async extractAllLinks(page: Page): Promise<string[]> {
    try {
      const links = await page.$$eval("a", (anchors: HTMLAnchorElement[]) =>
        anchors
          .map((anchor: HTMLAnchorElement) => anchor.href)
          .filter((href) => !!href)
      );
      return links.map((link: string) => {
        try {
          return new URL(link, page.url()).href; // 상대 경로를 절대 경로로 변환
        } catch (e) {
          return link; // 변환 실패 시 원본 반환
        }
      });
    } catch (error) {
      console.error("Error extracting links:", error);
      return [];
    }
  }

  /**
   * 페이지의 body 텍스트 콘텐츠를 추출합니다.
   * @param page Puppeteer Page 객체
   * @returns 페이지의 텍스트 콘텐츠 또는 빈 문자열
   */
  protected async extractBodyText(page: Page): Promise<string> {
    try {
      return await page.$eval("body", (body: HTMLElement) => body.innerText);
    } catch (error) {
      console.error("Error extracting body text:", error);
      return "";
    }
  }
}
