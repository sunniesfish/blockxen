// Global interfaces can be defined here

import { TargetSiteEntity } from "@/database/entities/target-site.entity";

export interface PageData {
  extractedData: {
    url?: string;
    description?: string;
  }[];
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
  OPEN_CHAT_LINK = "OPEN_CHAT_LINK",
  DISCORD_LINK = "DISCORD_LINK",
  COMMUNITY = "COMMUNITY",
  UNKNOWN = "UNKNOWN",
}
