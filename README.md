# BlockXen 크롤러 프로젝트 기술 분석

## 프로젝트 개요

**BlockXen**은 Node.js 기반의 지능형 웹 크롤링 시스템으로, 커뮤니티 사이트와 검색 결과를 대상으로 불법 서버, 도박 사이트, 오픈챗 링크 등의 타겟 사이트를 자동 탐지하고 수집하는 시스템입니다.

## 핵심 아키텍처

### 전략 패턴 기반 크롤링 시스템

- **Strategy Pattern**: 각 사이트 유형별로 특화된 데이터 추출 전략을 구현
- **Base Strategy**: 모든 전략의 기본 클래스로 공통 기능 제공
- **Specialized Strategies**:
  - `GoogleSearchResultStrategy`: 구글 검색 결과 페이지 전용
  - `CommunitySiteStrategy`: 커뮤니티 사이트 전용 (확장 예정)
  - `SnsXStrategy`, `SnsYoutubeStrategy`: SNS 전용 (미구현)

### 큐 기반 태스크 스케줄링

프로젝트는 정교한 큐 시스템을 통해 크롤링 작업을 관리합니다:

```
Q1_communityDomains → 커뮤니티 도메인 큐
S1_searchResultData → 검색 결과 링크 큐
K1_keywords → 검색 키워드 집합
R1_domainKeywordMap → 도메인별 적용된 키워드 매핑
R2_discoveredTargetDomains → 발견된 타겟 도메인 집합
```

### 알고리즘 플로우

1. **초기화 단계**

   - 시드 커뮤니티 도메인 로드 (dcinside.com, fmkorea.com 등)
   - 시드 키워드 로드 (프리섭, 첫충, 홍보채널 등)

2. **검색 단계**

   - 각 커뮤니티 도메인에 대해 키워드별 site: 검색 수행
   - 구글 검색 결과에서 관련 링크 추출
   - 키워드 하이라이팅 기반 필터링으로 정확도 향상

3. **탐색 단계**

   - 추출된 링크들을 실제 방문하여 페이지 데이터 수집
   - 전략 패턴을 통한 사이트 유형별 맞춤 처리

4. **분석 단계**
   - 수집된 데이터에서 새로운 커뮤니티 도메인 발견
   - 타겟 사이트 분류 (불법 서버, 도박, 오픈챗 등)
   - 새로운 키워드 추출로 탐지 범위 확장

## 기술적 특징

### TypeScript + NestJS 스타일 아키텍처

- **강타입 시스템**: 모든 인터페이스와 데이터 구조가 명확히 정의
- **의존성 주입**: 서비스 간 느슨한 결합으로 테스트 가능성 향상
- **모듈화**: 각 기능별로 분리된 서비스 구조

### Puppeteer 클러스터 관리

- **Cluster 기반 브라우저 관리**: 동시성과 안정성 확보
- **Retry 메커니즘**: 실패한 작업에 대한 자동 재시도
- **리소스 최적화**: 브라우저 인스턴스의 효율적 생성/해제

### TypeORM + MySQL 데이터 저장소

- **엔티티 기반 데이터 모델링**: `TargetSiteEntity`로 수집 데이터 구조화
- **인덱싱 최적화**: URL과 정규화된 도메인에 대한 효율적 검색
- **중복 방지**: 이미 수집된 사이트에 대한 중복 저장 방지

### 지능형 필터링 시스템

```typescript
// 키워드 기반 필터링
private readonly keywords = ["프리섭", "첫충", "홍보채널"];

// 패턴 기반 탐지
private readonly openChatPattern = /open\.kakao\.com\/o\/[a-zA-Z0-9]+/gi;
private readonly gamblingKeywords = ["카지노", "바카라", "토토"];
```

### 확장 가능한 사이트 분류 시스템

```typescript
export enum SiteType {
  ILLEGAL_FREE_SERVER = "ILLEGAL_FREE_SERVER",
  GAMBLING = "GAMBLING",
  OPEN_CHAT_LINK = "OPEN_CHAT_LINK",
  DISCORD_LINK = "DISCORD_LINK",
  COMMUNITY = "COMMUNITY",
  UNKNOWN = "UNKNOWN",
}
```

## 알고리즘의 핵심 혁신점

### 1. 키워드 진화 알고리즘

- 수집된 데이터에서 새로운 키워드를 자동 추출
- 키워드 세트가 확장됨에 따라 탐지 범위 자동 확장
- 도메인별 키워드 적용 히스토리 관리로 중복 작업 방지

### 2. 도메인 발견 체인

- 커뮤니티 → 검색 결과 → 타겟 사이트 → 새로운 커뮤니티 발견
- 체인 형태의 탐색으로 미지의 위험 사이트까지 도달
- 순환 참조 방지를 위한 방문 기록 관리

### 3. 컨텍스트 인식 추출

- 구글 검색 결과에서 `<em>`, `<b>` 태그 하이라이팅 활용
- 키워드 매칭뿐만 아니라 문맥상 관련성까지 고려
- DOM 구조 분석을 통한 정확한 링크-설명 매핑

## 설정 및 확장성

### 환경 변수 기반 설정

```typescript
export const config = {
  puppeteer: {
    maxConcurrency: 5,
    timeoutMs: 30000,
    retryLimit: 2,
  },
  crawler: {
    initialSeedDomains: ["dcinside.com", "fmkorea.com"],
    initialSeedKeywords: ["프리섭", "첫충", "홍보채널"],
    maxCrawlCycles: 1000,
  },
};
```

### 전략 확장 인터페이스

새로운 사이트 유형에 대한 전략 추가가 용이하도록 설계:

```typescript
interface IExtractionStrategy {
  extract(
    page: Page,
    currentUrl: string
  ): Promise<PageData | SearchData[] | null>;
}
```

## 프로젝트 구조

```
src/
├── main.ts                     # 애플리케이션 진입점
├── config/                     # 설정 관리
│   ├── index.ts               # 메인 설정
│   └── typeorm.config.ts      # TypeORM 설정
├── core/                      # 핵심 서비스
│   └── services/
│       ├── crawler-scheduler.service.ts    # 크롤링 스케줄러
│       ├── puppeteer-cluster.manager.ts   # Puppeteer 클러스터 관리
│       ├── strategy.manager.ts            # 전략 패턴 매니저
│       └── data-processor.service.ts      # 데이터 처리 서비스
├── strategies/                # 추출 전략들
│   ├── base.strategy.ts       # 기본 전략 클래스
│   ├── google-search-result.strategy.ts
│   ├── community-site.strategy.ts
│   ├── sns-x.strategy.ts
│   └── sns-youtube.strategy.ts
├── database/                  # 데이터베이스 관련
│   ├── entities/
│   │   └── target-site.entity.ts
│   └── services/
│       └── storage.service.ts
├── interfaces/                # 타입 정의
│   └── index.ts
└── common/                    # 공통 유틸리티
    └── utils.ts
```

## 기술 스택

- **런타임**: Node.js + TypeScript
- **브라우저 자동화**: Puppeteer + Puppeteer Cluster
- **데이터베이스**: MySQL + TypeORM
- **아키텍처 패턴**: Strategy Pattern, Dependency Injection
- **큐 시스템**: Custom Queue Implementation

## 결론

이 시스템은 단순한 크롤러를 넘어서 **자가 학습하는 위험 사이트 탐지 시스템**으로, 새로운 키워드와 도메인을 지속적으로 발견하며 탐지 범위를 확장하는 지능형 보안 도구입니다.

핵심 특징:

- **확장 가능한 전략 패턴**으로 새로운 사이트 유형 대응
- **지능형 키워드 진화**로 탐지 범위 자동 확장
- **효율적인 큐 시스템**으로 대규모 크롤링 작업 관리
- **강타입 TypeScript**로 안정성과 유지보수성 확보
