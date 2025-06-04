import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

import { SiteType, LinkType } from "@/interfaces";

@Entity({ name: "target_sites" })
export class TargetSiteEntity {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id!: string; // TypeORM에서 bigint는 string으로 매핑하는 것이 안전할 수 있음

  @Index({ unique: true })
  @Column({ type: "varchar", length: 2048 })
  url!: string;

  // 오픈챗 링크 또는 디스코드 링크인 경우 url과 동일
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

  @Column({
    type: "enum",
    enum: LinkType,
    default: LinkType.WEBSITE,
    name: "link_type",
    nullable: false,
  })
  linkType!: LinkType;

  @Column({ type: "varchar", length: 2048, name: "source_url", nullable: true })
  sourceUrl?: string | null;
}
