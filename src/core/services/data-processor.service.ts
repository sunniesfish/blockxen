import { LinkType, PageData, ProcessedData, SiteType } from "@/interfaces";
import { TargetSiteEntity } from "@/database/entities/target-site.entity";
import { StorageService } from "@/database/services/storage.service";
import { config } from "@/config";
import { normalizeDomain } from "@/common/utils";

// 로직 완성 필요
export class DataProcessorService {
  private readonly storageService: StorageService;
  private readonly ILLEGAL_FREE_SERVER_KEYWORDS: string[];
  private readonly GAMBLING_KEYWORDS: string[];

  constructor(storageService: StorageService) {
    this.storageService = storageService;
    this.ILLEGAL_FREE_SERVER_KEYWORDS =
      config.crawler.illegalFreeServerIndicator.split(",");
    this.GAMBLING_KEYWORDS = config.crawler.gamblingIndicator.split(",");
  }

  /**
   * PageData를 분석하여 새로운 도메인, 타겟 사이트, 키워드를 추출.
   * @param pageData 크롤링된 페이지 데이터
   * @param sourceUrl 이 pageData를 얻은 원본 URL
   * @returns ProcessedData 객체
   */
  public async processPageData(
    pageData: PageData,
    sourceUrl: string
  ): Promise<ProcessedData> {
    const newCommunityDomains: Set<string> = new Set();
    const newTargetSites: Map<
      string,
      Omit<TargetSiteEntity, "id" | "discoveredAt" | "lastCrawledAt">
    > = new Map();
    const newKeywords: Set<string> = new Set();

    for (const data of pageData.extractedData) {
      if (data.url) {
        const keywords = this.extractKeywords(data.description);
        const siteType = this.extractSiteType(data.title ?? "", keywords);
        keywords.forEach((keyword) => newKeywords.add(keyword));
        switch (data.linkType) {
          case LinkType.COMMUNITY_SITE: {
            const normalizedDomain = normalizeDomain(data.url);
            newCommunityDomains.add(normalizedDomain);
            break;
          }
          case LinkType.OPEN_CHAT_LINK: {
            !newTargetSites.has(data.url) &&
              newTargetSites.set(data.url, {
                url: data.url,
                linkType: LinkType.OPEN_CHAT_LINK,
                siteType: siteType,
                sourceUrl: sourceUrl,
                normalizedDomain: data.url,
                siteName: data.title,
              });
            break;
          }
          case LinkType.DISCORD_LINK: {
            !newTargetSites.has(data.url) &&
              newTargetSites.set(data.url, {
                url: data.url,
                linkType: LinkType.DISCORD_LINK,
                siteType: siteType,
                sourceUrl: sourceUrl,
                normalizedDomain: data.url,
                siteName: data.title,
              });
            break;
          }
          case LinkType.WEBSITE: {
            const normalizedDomain = normalizeDomain(data.url);
            !newTargetSites.has(data.url) &&
              newTargetSites.set(data.url, {
                url: data.url,
                linkType: LinkType.WEBSITE,
                siteType: siteType,
                sourceUrl: sourceUrl,
                normalizedDomain: normalizedDomain,
                siteName: data.title,
              });
            break;
          }
          default:
            break;
        }
      } else if (data.description) {
        this.extractKeywords(data.description).forEach((keyword) =>
          newKeywords.add(keyword)
        );
      }
    }

    return {
      newCommunityDomains: Array.from(newCommunityDomains),
      newTargetSites: Array.from(newTargetSites.values()),
      newKeywords: Array.from(newKeywords),
    };
  }

  private extractKeywords(text: string): string[] {
    return text
      .split(" ")
      .filter((word) => word.length >= 2)
      .map((word) => word.toLowerCase());
  }

  private extractSiteType(siteName: string, keywords: string[]): SiteType {
    const lowerSiteName = siteName.toLowerCase();

    if (
      this.GAMBLING_KEYWORDS.some((keyword) =>
        lowerSiteName.includes(keyword)
      ) ||
      keywords.some((keyword) =>
        this.GAMBLING_KEYWORDS.includes(keyword.toLowerCase())
      )
    ) {
      return SiteType.GAMBLING;
    }

    if (
      this.ILLEGAL_FREE_SERVER_KEYWORDS.some((keyword) =>
        lowerSiteName.includes(keyword)
      ) ||
      keywords.some((keyword) =>
        this.ILLEGAL_FREE_SERVER_KEYWORDS.includes(keyword.toLowerCase())
      )
    ) {
      return SiteType.ILLEGAL_FREE_SERVER;
    }

    return SiteType.UNKNOWN;
  }
}
