import mysql from "mysql2/promise";

// Pool 타입을 명시적으로 가져옵니다.
import { Pool, PoolOptions } from "mysql2/promise";

let pool: Pool | null = null;

/**
 * MySQL 데이터베이스 연결 풀을 생성하고 반환합니다.
 * 이미 생성된 풀이 있다면 그것을 반환합니다.
 * @returns MySQL 연결 풀
 * @throws 환경 변수가 설정되지 않았거나 연결 실패 시 예외를 던집니다.
 */
export function getDbPool(): Pool {
  if (pool) {
    return pool;
  }

  const options: PoolOptions = {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "mydatabase",
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || "10", 10),
    queueLimit: 0, // 무제한 대기열
  };

  // 필수 환경 변수 확인
  if (!options.host || !options.user || !options.database) {
    throw new Error(
      "Database configuration error: DB_HOST, DB_USER, and DB_NAME must be set in environment variables."
    );
  }

  try {
    pool = mysql.createPool(options);
    console.log("MySQL Pool created successfully.");

    // 연결 테스트 (선택 사항, 애플리케이션 시작 시점에 확인 가능)
    // pool.getConnection()
    //   .then(connection => {
    //     console.log('Successfully connected to the database via pool.');
    //     connection.release();
    //   })
    //   .catch(err => {
    //     console.error('Failed to get a connection from pool:', err);
    //     // 여기서 pool을 null로 다시 설정하거나, 애플리케이션을 종료하는 등의 처리를 할 수 있습니다.
    //     pool = null; // 풀 생성이 실질적으로 실패한 것으로 간주
    //     throw err; // 에러를 다시 던져서 getDbPool 호출부에서 처리하도록 함
    //   });

    return pool;
  } catch (error) {
    console.error("Failed to create MySQL Pool:", error);
    throw error;
  }
}

/**
 * MySQL 데이터베이스 연결 풀을 닫습니다.
 */
export async function closeDbPool(): Promise<void> {
  if (pool) {
    try {
      await pool.end();
      pool = null;
      console.log("MySQL Pool closed successfully.");
    } catch (error) {
      console.error("Failed to close MySQL Pool:", error);
      throw error;
    }
  }
}
