6.01 : {

    CrawlerSchedulerService : {
        processExploredData : {
            this.Q1_communityDomains.toArray().includes(normDomain)로직 경량화,
        },
        processS1_searchResultLinks() : urlToExplore의 형태를 체크하는 로직 필요. 현재는 커뮤니티 strategy만 적용 중,
        checkAndPrepareForRestart() : {
            **한 커뮤니티에 대한 재귀탐색 횟수 제한 추가 필요,
            O(n) 개선 필요
        }
    },
    StrategyManager : {
       ** getStrategy : strategyHint 별 strategy extract 로직 구현 필요
    },
    DataProcessorService : {
        기본 키워드 수정 필요,
        ** processPageData : 키워드 및 url 식별 로직 수정 필요

    }
    strategies : * 로직 체크 필요

}
