import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";

it("renders the bootstrap shell with Coin Hub title", () => {
  render(<HomePage />);
  expect(screen.getByText("Coin Hub")).toBeInTheDocument();
  expect(screen.getByText("Web Strategy Console")).toBeInTheDocument();
});
