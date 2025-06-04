import { URL } from "url"; // Node.js 내장 모듈

/**
 * URL 정규화
 * url을 입력받아 도메인 부분만 반환
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
    let cleanedUrl = urlString.replace(/^https?:\/\//, "").split("/")[0];
    cleanedUrl = cleanedUrl.split(":")[0];
    if (cleanedUrl.startsWith("www.")) {
      cleanedUrl = cleanedUrl.substring(4);
    }
    return cleanedUrl || urlString;
  }
}
