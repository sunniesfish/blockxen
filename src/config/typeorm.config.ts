import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import { TargetSiteEntity } from '@/database/entities/target-site.entity'; // 경로 수정 예정

dotenv.config(); // .env 파일 로드

export const typeOrmConfig: DataSourceOptions = {
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'blockxen_crawler',
  entities: [TargetSiteEntity], // 실제 엔티티 경로로 수정 필요
  synchronize: true, // 개발 환경에서만 true, 프로덕션에서는 false 권장
  logging: process.env.NODE_ENV === 'development' ? true : false,
  // entities: [__dirname + '/../**/entities/*.entity.{ts,js}'], // 또는 이렇게 경로 설정
  // migrations: [__dirname + '/../database/migrations/*.{ts,js}'],
  // subscribers: [__dirname + '/../database/subscribers/*.{ts,js}'],
  // cli: {
  //   entitiesDir: 'src/database/entities',
  //   migrationsDir: 'src/database/migrations',
  //   subscribersDir: 'src/database/subscribers',
  // },
};

// TypeORM CLI 또는 초기 DataSource 인스턴스 생성시 사용
// export const AppDataSource = new DataSource(typeOrmConfig); 