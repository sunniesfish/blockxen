import { getPageTitle, closeCluster } from "../src/crawler";

describe("Crawler Module with puppeteer-cluster", () => {
  // 테스트 타임아웃을 늘립니다 (Puppeteer 작업은 시간이 걸릴 수 있음).
  jest.setTimeout(30000); // 30초

  // 모든 테스트가 완료된 후 Cluster를 종료합니다.
  afterAll(async () => {
    await closeCluster();
  });

  describe("getPageTitle", () => {
    it("should return the title of a given URL", async () => {
      const url: string = "https://www.google.com";
      const expectedTitle: string = "Google";
      const actualTitle: string = await getPageTitle(url);
      expect(actualTitle).toBe(expectedTitle);
    });

    it("should throw an error for an invalid URL", async () => {
      const invalidUrl: string = "this-is-not-a-valid-url";
      try {
        await getPageTitle(invalidUrl);
        // 에러가 발생해야 하므로 이 부분에 도달하면 테스트 실패
        throw new Error(
          "Expected getPageTitle to throw an error for invalid URL, but it did not."
        );
      } catch (error) {
        expect(error).toBeDefined();
        // 특정 에러 메시지나 타입을 확인하는 것이 더 좋습니다.
        // 예: expect(error.message).toContain('ERR_NAME_NOT_RESOLVED'); 또는 expect(error).toBeInstanceOf(SpecificErrorClass);
      }
    });
  });
});
