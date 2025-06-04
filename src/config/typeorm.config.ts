import { DataSource, DataSourceOptions } from "typeorm";
import * as dotenv from "dotenv";
import { TargetSiteEntity } from "@/database/entities/target-site.entity";

dotenv.config();

export const typeOrmConfig: DataSourceOptions = {
  type: "mysql",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  username: process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_DATABASE || "blockxen_crawler",
  entities: [TargetSiteEntity],
  synchronize: true,
  logging: process.env.NODE_ENV === "development" ? true : false,
};
