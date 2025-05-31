import { DataSource, Repository } from "typeorm";
import { TargetSiteEntity, SiteType } from "../entities/target-site.entity";
import { typeOrmConfig } from "@/config"; // AppDataSource 직접 사용 대신 config에서 가져오기

export class StorageService {
  private targetSiteRepository!: Repository<TargetSiteEntity>;
  private readonly dataSource: DataSource;

  constructor() {
    // DataSource만 생성하고, repository는 initialize()에서 초기화
    this.dataSource = new DataSource(typeOrmConfig);
  }

  public async initialize(): Promise<void> {
    try {
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
      }
      this.targetSiteRepository =
        this.dataSource.getRepository(TargetSiteEntity);
    } catch (error) {
      throw new Error(`StorageService 초기화 실패: ${error}`);
    }
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.dataSource.isInitialized) {
        await this.dataSource.destroy();
      }
    } catch (error) {
      console.error("데이터베이스 연결 종료 중 오류 발생:", error);
      throw new Error(`StorageService 종료 실패: ${error}`);
    }
  }

  /**
   * 새로운 타겟 사이트를 데이터베이스에 저장합니다.
   * 이미 존재하는 URL이라면 저장하지 않고 기존 데이터를 반환하거나 null을 반환할 수 있습니다.
   */
  public async saveTargetSite(data: {
    url: string;
    normalizedDomain: string;
    siteName?: string;
    siteType: SiteType;
    sourceUrl?: string;
  }): Promise<TargetSiteEntity | null> {
    try {
      const existingSite = await this.targetSiteRepository.findOneBy({
        url: data.url,
      });
      if (existingSite) {
        return existingSite;
      }
      const newSite = this.targetSiteRepository.create(data);
      return await this.targetSiteRepository.save(newSite);
    } catch (error: any) {
      console.error("Error saving target site:", error);
      if (error && error.code === "ER_DUP_ENTRY") {
        console.warn(`Duplicate entry for URL: ${data.url}`);
        return this.targetSiteRepository.findOneBy({ url: data.url });
      }
      return null;
    }
  }

  public async getTargetSiteByUrl(
    url: string
  ): Promise<TargetSiteEntity | null> {
    return this.targetSiteRepository.findOneBy({ url });
  }

  public async getTargetSiteByNormalizedDomain(
    normalizedDomain: string
  ): Promise<TargetSiteEntity | null> {
    return this.targetSiteRepository.findOneBy({ normalizedDomain });
  }

  /**
   * 데이터베이스에 저장된 모든 타겟 사이트의 정규화된 도메인 목록을 반환합니다.
   */
  public async getAllTargetNormalizedDomains(): Promise<string[]> {
    try {
      const sites = await this.targetSiteRepository.find({
        select: ["normalizedDomain"],
      });
      return sites.map((site) => site.normalizedDomain);
    } catch (error) {
      console.error("Error fetching all target normalized domains:", error);
      return [];
    }
  }
}
