import { Page } from "puppeteer";
import { PageData } from "@/interfaces";
import { BaseExtractionStrategy } from "./base.strategy";

/**
 * 커뮤니티 사이트 특화 전략
 */
export class CommunitySiteStrategy extends BaseExtractionStrategy {
  public override async extract(
    page: Page,
    currentUrl: string
  ): Promise<PageData | null> {
    // 여기에 커뮤니티 사이트 특화 로직
    // 예: 게시글 목록에서 특정 키워드가 포함된 게시글 링크 추출
    // 예: 게시글 내용에서 광고 배너, 특정 패턴(오픈챗은 DataProcessor가 처리) 탐지
    // 예: 게시글 내용에서 키워드 추출
    // 예: 게시글 내용에서 특정 패턴 추출
    // 예: 광고 배너 탐지 및 내용 추출

    return {
      extractedData: [
        {
          url: currentUrl,
          description: "",
        },
      ],
    };
  }
}
