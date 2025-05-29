import { getPageTitle, closeCluster } from "./crawler";
import { getDbPool, closeDbPool } from "./database/mysql.connector";
import { Pool } from "mysql2/promise";

async function main(): Promise<void> {
  let dbPool: Pool | null = null;
  try {
    // 1. Puppeteer Cluster를 사용한 크롤링 (기존 로직)
    const targetUrl: string = "https://www.google.com";
    console.log(`Fetching title from ${targetUrl}...`);
    const title: string = await getPageTitle(targetUrl);
    console.log(`Page title: ${title}`);

    // 2. MySQL 데이터베이스 연결 및 테스트
    console.log("Attempting to connect to MySQL database...");
    dbPool = getDbPool(); // 연결 풀 가져오기 또는 생성
    const connection = await dbPool.getConnection();
    console.log("Successfully connected to MySQL database.");

    // 간단한 쿼리 실행 테스트
    const [rows] = await connection.query("SELECT NOW() as currentTime;");
    console.log("Current time from DB:", (rows as any)[0].currentTime);

    connection.release(); // 연결 반환
  } catch (error) {
    console.error("An error occurred in the main application:", error);
  } finally {
    // 3. 모든 리소스 정리
    console.log("Closing resources...");
    await closeCluster();
    console.log("Puppeteer Cluster closed.");
    if (dbPool) {
      await closeDbPool();
      console.log("MySQL Pool closed.");
    }
    console.log("Application finished.");
  }
}

main();
