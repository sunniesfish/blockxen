// Global interfaces can be defined here

import { TargetSiteEntity } from "@/database/entities/target-site.entity";
import { Page } from "puppeteer";

export interface PageData {
  extractedData: {
    url?: string;
    description: string;
    title?: string;
    linkType?: LinkType;
  }[];
}

export enum LinkType {
  OPEN_CHAT_LINK = "open_chat_link",
  DISCORD_LINK = "discord_link",
  WEBSITE = "website",
  COMMUNITY_SITE = "communitySite",
}

export interface SearchData {
  link: string;
  strategyHint: strategyHint;
}

// 기본 크롤 작업 인터페이스
interface BaseCrawlTask {
  strategyHint: strategyHint; // 어떤 전략을 사용할지 힌트 (선택적)
}

export type strategyHint =
  | "search-result-page"
  | "community-site"
  | "sns-x"
  | "sns-youtube"
  | "unknown";

// 직접 URL 방문 작업
interface DirectUrlTask extends BaseCrawlTask {
  targetUrl: string; // 직접 방문할 URL
  domainToSearch?: never; // 검색 작업이 아니므로 undefined
  keywordToSearch?: never; // 검색 작업이 아니므로 undefined
}

// 도메인 내 키워드 검색 작업
interface SearchTask extends BaseCrawlTask {
  targetUrl?: never; // 검색 작업이므로 직접 URL은 undefined
  domainToSearch: string; // site:D1 형태로 검색할 도메인
  keywordToSearch: string; // "K" 검색어
}

// Union 타입으로 두 작업 유형을 결합
export type CrawlTask = DirectUrlTask | SearchTask;

export interface ProcessedData {
  newCommunityDomains: string[];
  newTargetSites: Omit<
    TargetSiteEntity,
    "id" | "discoveredAt" | "lastCrawledAt"
  >[];
  newKeywords: string[];
}

export enum SiteType {
  ILLEGAL_FREE_SERVER = "ILLEGAL_FREE_SERVER",
  GAMBLING = "GAMBLING",
  UNKNOWN = "UNKNOWN",
}

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
  extract(
    page: Page,
    currentUrl: string
  ): Promise<PageData | SearchData[] | null>;
}

export interface DomainMetadata {
  retryCount: number;
  keywordCount: number;
}
