6.01 : {

    CrawlerSchedulerService : {
        processExploredData : {
            this.Q1_communityDomains.toArray().includes(normDomain)로직 경량화,
        },
        checkAndPrepareForRestart() : {
            **한 커뮤니티에 대한 재귀탐색 횟수 제한 추가 필요,
            O(n) 개선 필요
        }
    },
    DataProcessorService : {
        기본 키워드 수정 필요,
        ** processPageData : 키워드 및 url 식별 로직 수정 필요
    }
    strategies : * 로직 체크 필요

},
6.02 : {

    CrawlerSchedulerService : {
        processExploredData : {
            this.Q1_communityDomains.toArray().includes(normDomain)로직 경량화,
        },
        checkAndPrepareForRestart() : {
            **** 현재 동작이 맞는가? : 얘가 지금 isCrawling을 설정할 수 있는데 이러면 안되지 않나??
            **한 커뮤니티에 대한 재귀탐색 횟수 제한 추가 필요,
            O(n) 개선 필요
        }
    },
    DataProcessorService : {
        기본 키워드 수정 필요,
        extracting 로직 구현 필요 : {
            유사도메인 처리 어떻게 하고 있는지 체크 필요
        }
    }
    strategies/ : *** 로직 구현 필요

}
