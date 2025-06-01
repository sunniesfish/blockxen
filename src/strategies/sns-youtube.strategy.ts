import { PageData } from "@/interfaces";
import { BaseExtractionStrategy } from "./base.strategy";
import { Page } from "puppeteer";

/**
 * 유튜브 영상 페이지 특화 전략
 * 유튜브 영상 페이지 특화 로직 추가 (TODO)
 */
export class SnsYoutubeStrategy extends BaseExtractionStrategy {
  public async extract(
    page: Page,
    currentUrl: string
  ): Promise<PageData | null> {
    // 영상 프레임 캡처 및 추출
    // 댓글 확인
    // 영상 제목 추출
    // 영상 설명 추출
    return null;
  }
}
