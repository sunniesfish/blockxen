import { Page } from "puppeteer";
import { BaseExtractionStrategy, IExtractionStrategy } from "./base.strategy";
import { SearchData } from "@/interfaces";

/**
 * Google 검색 결과 페이지에서 실제 검색 결과 링크들을 추출하는 전략입니다.
 */
export class GoogleSearchResultStrategy
  extends BaseExtractionStrategy
  implements IExtractionStrategy
{
  public async extract(page: Page, url: string): Promise<SearchData[]> {
    // Google 검색 결과 페이지의 DOM 구조는 매우 특정적이며, 자주 변경될 수 있습니다.
    // 여기서는 예시로 일반적인 선택자를 사용합니다.
    // 실제로는 더 견고한 선택자나 분석 방법이 필요합니다.
    const extractedLinks = await page.evaluate(() => {
      const links: string[] = [];
      // Google 검색 결과 링크는 보통 특정 클래스나 구조를 가집니다.
      // 예: 'a h3' (제목을 감싸는 a 태그), 또는 특정 div 내부의 a 태그
      // document.querySelectorAll('div.g a[href]').forEach(el => {
      // document.querySelectorAll('a[jsname][href]').forEach(el => {
      // document.querySelectorAll('div[data-ved] a[href]').forEach(el => {
      document.querySelectorAll('a[href^="/url?q="]').forEach((el) => {
        const href = (el as HTMLAnchorElement).href;
        if (href) {
          // Google의 리디렉션 URL (/url?q=) 에서 실제 URL 추출 시도
          try {
            const urlParams = new URLSearchParams(new URL(href).search);
            const actualUrl = urlParams.get("q");
            if (
              actualUrl &&
              !actualUrl.startsWith("http://webcache.googleusercontent.com")
            ) {
              links.push(actualUrl);
            }
          } catch (e) {
            // 일반 링크일 수도 있음, 또는 잘못된 URL 형식
            // console.warn('Could not parse Google redirect URL:', href);
          }
        }
      });
      // 일반적인 링크도 추가 (예: 관련 검색어, 뉴스 등)
      // document.querySelectorAll('a[href]').forEach(el => links.push((el as HTMLAnchorElement).href));
      return links;
    });

    const extractedText = await page.evaluate(() => {
      // 검색 결과 페이지의 텍스트를 가져올 수 있으나, 양이 많을 수 있음
      // return document.body.innerText || '';
      // 각 검색 결과의 제목이나 스니펫을 모아서 반환하는 것이 더 유용할 수 있음
      const texts: string[] = [];
      document.querySelectorAll("h3").forEach((h3) => texts.push(h3.innerText));
      return texts;
    });

    const htmlContent = await page.content();

    return [
      {
        link: url,
        strategyHint: "search-result-page",
      },
    ];
  }
}
