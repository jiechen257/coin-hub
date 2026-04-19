// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { ReviewTagEditor } from "@/components/research-desk/review-tag-editor";

it("edits preset and custom tags before saving", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn().mockResolvedValue(undefined);

  render(
    <ReviewTagEditor
      value={["趋势跟随"]}
      options={[
        { label: "趋势跟随", kind: "preset" },
        { label: "止损纪律差", kind: "preset" },
      ]}
      onSave={onSave}
    />,
  );

  await user.click(screen.getByRole("button", { name: "止损纪律差" }));
  await user.type(screen.getByLabelText("自定义标签"), "新闻催化");
  await user.click(screen.getByRole("button", { name: "添加标签" }));
  await user.click(screen.getByRole("button", { name: "保存标签" }));

  expect(onSave).toHaveBeenCalledWith(["趋势跟随", "止损纪律差", "新闻催化"]);
});
