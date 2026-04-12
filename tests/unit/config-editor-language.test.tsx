import { render, screen } from "@testing-library/react";
import { ConfigEditor } from "@/components/config/config-editor";

it("renders config editor with Chinese labels", () => {
  render(
    <ConfigEditor
      currentVersion={{
        id: "version-1",
        summary: "基础风控配置",
        params: { riskPct: 0.8 },
        isActive: true,
      }}
      versions={[
        {
          id: "version-1",
          summary: "基础风控配置",
          params: { riskPct: 0.8 },
          isActive: true,
        },
      ]}
    />,
  );

  expect(screen.getByText("当前生效版本")).toBeInTheDocument();
  expect(screen.getByLabelText("摘要")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "创建新版本" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "版本历史" })).toBeInTheDocument();
});
