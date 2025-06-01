import { PageData, ProcessedData, SiteType } from "@/interfaces";
import { TargetSiteEntity } from "@/database/entities/target-site.entity";
import { normalizeDomain } from "@/common/utils";
import { StorageService } from "@/database/services/storage.service";

// 로직 완성 필요
export class DataProcessorService {
  private readonly storageService: StorageService;
  private readonly openChatPattern = /open\.kakao\.com\/o\/[a-zA-Z0-9]+/gi;
  private readonly gamblingKeywords = [
    "카지노",
    "바카라",
    "토토",
    "스포츠베팅",
    "슬롯",
  ];
  private readonly privateServerKeywords = [
    "프리서버",
    "리니지프리",
    "메이플프리",
    "서버오픈",
  ];
  private readonly adServerIndicators = [
    "ad.",
    "ads.",
    "advert",
    "adserver",
    "adsystem",
  ];
  private readonly knownAdServerDomains = [
    "doubleclick.net",
    "googleadservices.com",
    "taboola.com",
  ];

  constructor(storageService: StorageService) {
    this.storageService = storageService;
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

    for (const linkData of pageData.extractedData) {
      const siteName = this.extractSiteName(linkData.url, linkData.description);
      const keywords = this.extractKeywords(linkData.description);
      const siteType = this.extractSiteType(siteName, keywords);
      if (linkData.url) {
        const normalizedDomain = normalizeDomain(linkData.url);
        const targetSite: Omit<
          TargetSiteEntity,
          "id" | "discoveredAt" | "lastCrawledAt"
        > = {
          url: linkData.url,
          normalizedDomain: normalizedDomain,
          siteName: siteName,
          siteType: siteType,
        };

        if (siteType === SiteType.COMMUNITY) {
          newCommunityDomains.add(normalizedDomain);
        } else {
          newTargetSites.set(normalizedDomain, targetSite);
        }
      }
      for (const keyword of keywords) {
        newKeywords.add(keyword);
      }
    }

    return {
      newCommunityDomains: Array.from(newCommunityDomains),
      newTargetSites: Array.from(newTargetSites.values()),
      newKeywords: Array.from(newKeywords),
    };
  }

  private extractSiteName(
    link: string | undefined,
    textContent: string | undefined
  ): string | undefined {
    return undefined;
  }

  private extractKeywords(text: string | undefined): string[] {
    if (!text) return [];
    return text.split(" ").filter((word) => word.length > 2);
  }

  private extractSiteType(
    siteName: string | undefined,
    keywords: string[]
  ): SiteType {
    return SiteType.UNKNOWN;
  }
}
