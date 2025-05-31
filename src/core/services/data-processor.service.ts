import { PageData } from "@/interfaces";
import {
  TargetSiteEntity,
  SiteType,
} from "@/database/entities/target-site.entity";
import { normalizeDomain, getBaseDomain, isValidUrl } from "@/common/utils";
import { StorageService } from "@/database/services/storage.service";

export interface ProcessedData {
  newCommunityDomains: string[];
  newTargetSites: Omit<
    TargetSiteEntity,
    "id" | "discoveredAt" | "lastCrawledAt"
  >[];
  newKeywords: string[];
}
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

    // 1. 링크 분석 (알고리즘 [6], [7])
    for (const link of pageData.extractedLinks) {
      if (!isValidUrl(link)) continue;

      const normalizedLinkDomain = normalizeDomain(link);
      if (!normalizedLinkDomain) continue;

      // 광고 배너 호스트 우선 식별
      if (this.isAdBannerHost(normalizedLinkDomain)) {
        if (!newTargetSites.has(link)) {
          newTargetSites.set(link, {
            url: link,
            normalizedDomain: normalizedLinkDomain,
            siteType: SiteType.AD_BANNER_HOST,
            sourceUrl: sourceUrl,
            siteName:
              this.extractSiteName(link, pageData.extractedText) ||
              normalizedLinkDomain,
          });
        }
        continue; // 광고 배너는 다른 유형으로 중복 처리하지 않음
      }

      // 오픈채팅 링크 처리
      if (this.isOpenChatLink(link)) {
        if (!newTargetSites.has(link)) {
          newTargetSites.set(link, {
            url: link,
            normalizedDomain: normalizedLinkDomain, // 오픈카톡 링크의 경우 도메인은 open.kakao.com
            siteType: SiteType.OPEN_CHAT_LINK,
            sourceUrl: sourceUrl,
            siteName: "Kakao Open Chat", // 이름 부여 가능
          });
          // 오픈채팅방 이름 등을 키워드로 추가하는 로직도 가능
        }
        continue; // 오픈채팅 링크는 커뮤니티나 일반 타겟으로 분류하지 않음
      }

      // 이미 알려진 커뮤니티 도메인인지, 아니면 새로운 커뮤니티 후보인지 판단
      // (이 로직은 CrawlerSchedulerService와 협력 필요. 여기선 일단 모든 새 도메인을 후보로 간주)
      // 또는 특정 패턴(forum, gallery, community 등)을 가진 도메인을 커뮤니티로 간주
      if (this.isPotentialCommunitySite(normalizedLinkDomain)) {
        // R2(DB)에 없는 새로운 커뮤니티 도메인이면 추가 (CrawlerScheduler가 처리)
        newCommunityDomains.add(normalizedLinkDomain);
      } else if (this.isPotentialTargetSite(link, pageData.extractedText)) {
        // 타겟 사이트로 판단 (불법/홍보 등)
        const siteType = this.determineSiteType(link, pageData.extractedText);
        if (!newTargetSites.has(link)) {
          newTargetSites.set(link, {
            url: link,
            normalizedDomain: normalizedLinkDomain,
            siteType: siteType,
            sourceUrl: sourceUrl,
            siteName:
              this.extractSiteName(link, pageData.extractedText) ||
              normalizedLinkDomain,
          });
          // 도메인 명 자체를 키워드로 추가 (알고리즘 [7-2])
          newKeywords.add(normalizedLinkDomain.split(".")[0]); // 예: 'blockxen' from 'blockxen.com'
        }
      }
    }

    // 2. 텍스트 분석 (알고리즘 [8])
    for (const text of pageData.extractedText) {
      // 예시: "XX서버 오픈!", "첫충 10%" 등 특정 패턴/키워드 찾기
      this.privateServerKeywords.forEach((keyword) => {
        if (text.includes(keyword)) newKeywords.add(keyword);
      });
      this.gamblingKeywords.forEach((keyword) => {
        if (text.includes(keyword)) newKeywords.add(keyword);
      });
      // "사이트 이름" + "오픈" 등의 패턴으로 키워드 추출 시도
      const siteNamePattern = /(\S+서버)\s*(오픈|OPEN)/gi;
      let match;
      while ((match = siteNamePattern.exec(text)) !== null) {
        newKeywords.add(match[1]); // "XX서버"
      }
    }

    return {
      newCommunityDomains: Array.from(newCommunityDomains),
      newTargetSites: Array.from(newTargetSites.values()),
      newKeywords: Array.from(newKeywords),
    };
  }

  private isOpenChatLink(link: string): boolean {
    return this.openChatPattern.test(link);
  }

  private isAdBannerHost(domain: string): boolean {
    const lowerDomain = domain.toLowerCase();
    if (
      this.knownAdServerDomains.some((adDomain) =>
        lowerDomain.endsWith(adDomain)
      )
    ) {
      return true;
    }
    if (
      this.adServerIndicators.some((indicator) =>
        lowerDomain.includes(indicator)
      )
    ) {
      return true;
    }
    return false;
  }

  // 임시 - 커뮤니티 사이트 판단 로직 (더 정교화 필요)
  private isPotentialCommunitySite(domain: string): boolean {
    const communityIndicators = [
      "gall",
      "dcinside",
      "fmkorea",
      "community",
      "forum",
      "board",
    ];
    // 여기서는 storageService를 통해 기존 커뮤니티 목록을 조회하거나, CrawlerScheduler의 R1을 참조할 수도 있음
    return communityIndicators.some((indicator) => domain.includes(indicator));
  }

  // 임시 - 타겟 사이트 판단 로직 (더 정교화 필요)
  private isPotentialTargetSite(link: string, textContent: string[]): boolean {
    const concatenatedText = textContent.join(" ").toLowerCase();
    if (this.gamblingKeywords.some((kw) => concatenatedText.includes(kw)))
      return true;
    if (this.privateServerKeywords.some((kw) => concatenatedText.includes(kw)))
      return true;
    // 링크 자체에 특정 키워드가 들어가는 경우 (예: toto, casino 등)
    const linkLower = link.toLowerCase();
    if (
      this.gamblingKeywords.some((kw) =>
        linkLower.includes(kw.replace(" ", ""))
      )
    )
      return true;
    if (
      this.privateServerKeywords.some((kw) =>
        linkLower.includes(kw.replace(" ", ""))
      )
    )
      return true;

    return false; // 기본적으로는 타겟이 아니라고 판단
  }

  private determineSiteType(link: string, textContent: string[]): SiteType {
    const concatenatedText = textContent.join(" ").toLowerCase();
    const linkLower = link.toLowerCase();

    if (
      this.gamblingKeywords.some(
        (kw) =>
          concatenatedText.includes(kw) ||
          linkLower.includes(kw.replace(" ", ""))
      )
    ) {
      return SiteType.GAMBLING;
    }
    if (
      this.privateServerKeywords.some(
        (kw) =>
          concatenatedText.includes(kw) ||
          linkLower.includes(kw.replace(" ", ""))
      )
    ) {
      return SiteType.ILLEGAL_PRIVATE_SERVER;
    }
    // TODO: AD_BANNER_HOST 등 다른 타입 판단 로직 추가
    return SiteType.UNKNOWN;
  }

  private extractSiteName(
    link: string,
    textContent: string[]
  ): string | undefined {
    // 간단한 예: 링크 주변 텍스트에서 <title> 태그 내용이나 h1 태그 내용을 가져오는 등
    // Puppeteer Page 객체가 있다면 더 정확한 추출 가능 (여기서는 PageData만 사용)
    // 여기서는 일단 도메인에서 유추
    try {
      const domainParts = normalizeDomain(link).split(".");
      if (domainParts.length >= 2) return domainParts[0];
    } catch (e) {
      /* 무시 */
    }
    return undefined;
  }
}
