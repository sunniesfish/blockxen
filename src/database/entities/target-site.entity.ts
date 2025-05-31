import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum SiteType {
  ILLEGAL_PRIVATE_SERVER = "ILLEGAL_PRIVATE_SERVER",
  GAMBLING = "GAMBLING",
  AD_BANNER_HOST = "AD_BANNER_HOST",
  OPEN_CHAT_LINK = "OPEN_CHAT_LINK",
  COMMUNITY = "COMMUNITY", // 새로운 도메인이 커뮤니티 사이트일 경우
  UNKNOWN = "UNKNOWN",
}

@Entity({ name: "target_sites" })
export class TargetSiteEntity {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id!: string; // TypeORM에서 bigint는 string으로 매핑하는 것이 안전할 수 있음

  @Index({ unique: true })
  @Column({ type: "varchar", length: 2048 })
  url!: string;

  @Index()
  @Column({ type: "varchar", length: 255, name: "normalized_domain" })
  normalizedDomain!: string;

  @Column({ type: "varchar", length: 255, name: "site_name", nullable: true })
  siteName?: string | null;

  @Column({
    type: "enum",
    enum: SiteType,
    default: SiteType.UNKNOWN,
    name: "site_type",
  })
  siteType!: SiteType;

  @Column({ type: "varchar", length: 2048, name: "source_url", nullable: true })
  sourceUrl?: string | null;
}
