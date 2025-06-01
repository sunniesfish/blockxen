import { Page } from "puppeteer";
import { PageData } from "@/interfaces";
import { BaseExtractionStrategy } from "./base.strategy";
import { normalizeDomain } from "@/common/utils";

export class CommunitySiteStrategy extends BaseExtractionStrategy {
  // 특정 커뮤니티 사이트 도메인 목록 (예시)
  private readonly targetCommunityDomains: string[] = [
    "dcinside.com",
    "fmkorea.com",
    // 추가적인 커뮤니티 도메인들
  ];

  public override async extract(
    page: Page,
    currentUrl: string
  ): Promise<PageData | null> {
    console.log(`CommunitySiteStrategy extracting from: ${currentUrl}`);

    const htmlContent = await page.content();
    const extractedLinks = await this.extractAllLinks(page);
    const extractedText = await this.extractBodyText(page);

    // 여기에 커뮤니티 사이트 특화 로직 추가 (TODO)
    // 예: 게시글 목록에서 특정 키워드가 포함된 게시글 링크 추출
    // 예: 게시글 내용에서 광고 배너, 특정 패턴(오픈챗은 DataProcessor가 처리) 탐지
    // const specificExtractedLinks = ...;
    // const specificExtractedText = ...;

    return {
      url: currentUrl,
      htmlContent: htmlContent,
      extractedLinks: [...new Set(extractedLinks)], // 중복 제거된 전체 링크
      extractedText: [extractedText], // 페이지 전체 텍스트
      // 만약 specificExtractedLinks나 specificExtractedText가 있다면 여기에 병합
      strategyUsed: this.constructor.name,
    };
  }

  // 커뮤니티 사이트별로 다른 DOM 구조를 가질 수 있으므로,
  // 게시글 목록 선택자, 내용 선택자 등을 파라미터화 하거나
  // 하위 전략 클래스를 만들 수 있음
}
