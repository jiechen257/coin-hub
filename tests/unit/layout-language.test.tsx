import { renderToStaticMarkup } from "react-dom/server";
import RootLayout, { metadata } from "@/app/layout";

it("renders zh-CN root layout metadata", () => {
  const markup = renderToStaticMarkup(
    <RootLayout>
      <div>中文界面占位</div>
    </RootLayout>,
  );

  expect(markup).toContain('lang="zh-CN"');
  expect(metadata.description).toBe("单用户策略控制台");
});
