import { strategyHint } from "@/interfaces";
import { URL } from "url"; // Node.js 내장 모듈

export function getStrategyHint(urlString: string): strategyHint {
  const domain = normalizeDomain(urlString);
  if (domain.includes("x.com")) {
    return "sns-x";
  }
  if (domain.includes("youtube.com")) {
    return "sns-youtube";
  }
  if (domain.includes("/board/") || domain.includes("/bbs/")) {
    return "community-site";
  }
  return "unknown";
}

/**
 * URL 정규화
 * @param urlString 정규화할 URL 문자열
 * @returns 정규화된 도메인 또는 원본 URL (파싱 실패 시)
 */
export function normalizeDomain(urlString: string): string {
  try {
    if (!urlString.startsWith("http://") && !urlString.startsWith("https://")) {
      urlString = "http://" + urlString;
    }
    const parsedUrl = new URL(urlString);
    let domain = parsedUrl.hostname;
    if (domain.startsWith("www.")) {
      domain = domain.substring(4);
    }
    return domain;
  } catch (error) {
    console.warn(`Failed to normalize domain: ${urlString}`, error);
    const cleanedUrl = urlString.replace(/^https?:\/\//, "").split("/")[0];
    return cleanedUrl || urlString; // 파싱 완전 실패면 원본 반환
  }
}

/**
 * URL에서 기본 도메인을 추출합니다. (normalizeDomain과 유사하나, 프로토콜 유지 시도 가능)
 * @param urlString 추출할 URL 문자열
 * @returns 프로토콜 + 도메인 (예: https://example.com) 또는 null (파싱 실패 시)
 */
export function getBaseDomain(urlString: string): string | null {
  try {
    if (!urlString.startsWith("http://") && !urlString.startsWith("https://")) {
      urlString = "http://" + urlString;
    }
    const parsedUrl = new URL(urlString);
    return `${parsedUrl.protocol}//${parsedUrl.hostname}`;
  } catch (error) {
    console.warn(`Failed to get base domain: ${urlString}`, error);
    return null;
  }
}

export function isValidUrl(urlString: string): boolean {
  try {
    new URL(urlString);
    return true;
  } catch (error) {
    return false;
  }
}
