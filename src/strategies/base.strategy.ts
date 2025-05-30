import { Page } from "puppeteer";
import { PageData } from "@/interfaces";

/**
 * 데이터 추출 전략 인터페이스
 */
export interface IExtractionStrategy {
  /**
   * Page 객체에서 데이터를 추출
   * @param page Puppeteer의 Page 객체
   * @param currentUrl 현재 페이지의 URL (리다이렉션 등으로 page.url()과 다를 수 있음)
   * @returns 추출된 데이터를 담은 PageData 객체 또는 null (추출 실패/부적합 시)
   */
  extract(page: Page, currentUrl: string): Promise<PageData | null>;

  /**
   * 이 전략이 특정 URL에 적용 가능한지 판단
   * @param url 확인할 URL
   * @returns 적용 가능하면 true, 아니면 false
   */
  isApplicable(url: string): boolean;
}

/**
 * 기본 추출 전략 (모든 링크와 텍스트를 단순 추출)
 */
export abstract class BaseExtractionStrategy implements IExtractionStrategy {
  public abstract extract(
    page: Page,
    currentUrl: string
  ): Promise<PageData | null>;

  // 기본적으로 모든 URL에 적용 가능하도록 설정하거나, 하위 클래스에서 재정의
  public isApplicable(url: string): boolean {
    // 정규식 또는 특정 도메인 패턴으로 제한 가능
    console.log(`BaseExtractionStrategy.isApplicable called for: ${url}`); // 디버깅용
    return true;
  }

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
