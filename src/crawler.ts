import { Cluster } from "puppeteer-cluster";
import { Page } from "puppeteer"; // Page 타입을 계속 사용하기 위해 puppeteer에서 가져옵니다.

// Cluster 인스턴스를 한 번만 생성하여 재사용할 수 있도록 모듈 스코프에 선언합니다.
// 실제 애플리케이션에서는 이 Cluster의 launch, close를 적절히 관리해야 합니다.
let cluster: Cluster<string, string> | null = null;

async function getCluster(): Promise<Cluster<string, string>> {
  if (!cluster) {
    cluster = await Cluster.launch({
      concurrency: Cluster.CONCURRENCY_PAGE, // 페이지별 동시성
      maxConcurrency: 2, // 동시에 실행할 최대 작업 수
      puppeteerOptions: {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      },
      // monitor: true, // 클러스터 활동 모니터링 (디버깅 시 유용)
    });

    // 각 작업(페이지)에 대한 처리 로직 정의
    await cluster.task(
      async ({
        page,
        data: url,
      }: {
        page: Page;
        data: string;
      }): Promise<string> => {
        await page.goto(url, { waitUntil: "networkidle0" });
        const title: string = await page.title();
        return title;
      }
    );
  }
  return cluster;
}

/**
 * 주어진 URL의 페이지 타이틀을 가져옵니다. (puppeteer-cluster 사용)
 * @param url 크롤링할 페이지의 URL
 * @returns 페이지 타이틀 문자열
 * @throws 오류 발생 시 예외를 던집니다.
 */
export async function getPageTitle(url: string): Promise<string> {
  const currentCluster = await getCluster();
  try {
    // Cluster에 작업을 전달하고 결과를 받습니다.
    const title: string = await currentCluster.execute(url);
    return title;
  } catch (error) {
    console.error(
      `Error occurred while fetching page title from ${url} using cluster:`,
      error
    );
    // 실제 애플리케이션에서는 에러 유형에 따라 Cluster 재시작 등의 로직이 필요할 수 있습니다.
    throw error;
  }
}

/**
 * 애플리케이션 종료 또는 테스트 완료 시 Cluster를 안전하게 종료합니다.
 */
export async function closeCluster(): Promise<void> {
  if (cluster) {
    await cluster.idle(); // 모든 작업이 완료될 때까지 대기
    await cluster.close(); // 클러스터 종료
    cluster = null;
  }
}
