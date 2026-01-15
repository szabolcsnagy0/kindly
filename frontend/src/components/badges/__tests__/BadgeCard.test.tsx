import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BadgeCard } from "../BadgeCard";
import { Badge } from "../../../types/badge.types";

describe("BadgeCard", () => {
  const mockBadge: Badge = {
    id: 1,
    badge_id: 1,
    badge_name: "Test Badge",
    rarity: 2,
    description: "Test description",
    progress: 100,
    is_completed: true,
  };

  it("renders badge card", () => {
    render(<BadgeCard badge={mockBadge} />);
    const element = screen.getByText("Test Badge");
    expect(element).toBeDefined();
  });

  it("shows badge name", () => {
    render(<BadgeCard badge={mockBadge} />);
    expect(screen.getByText("Test Badge")).toBeTruthy();
  });

  it("handles click", () => {
    const onClick = vi.fn();
    render(<BadgeCard badge={mockBadge} onClick={onClick} />);

    const card = screen.getByText("Test Badge").closest("div");
    fireEvent.click(card!);

    expect(onClick).toHaveBeenCalled();
  });

  it("displays progress bar for incomplete badges", () => {
    const incompleteBadge = { ...mockBadge, is_completed: false, progress: 50 };
    const { container } = render(<BadgeCard badge={incompleteBadge} />);

    const progressBar = container.querySelector('[data-testid="progress-bar"]');
    expect(progressBar).toBeTruthy();
  });

  it("shows completed badge", () => {
    render(<BadgeCard badge={mockBadge} />);
    const element = screen.getByText(/Completed/i);
    expect(element).not.toBeNull();
  });

  it("has correct rarity color", () => {
    render(<BadgeCard badge={mockBadge} />);
    const element = screen.getByText("Test Badge").closest("div");
    expect(element).toHaveStyle({ borderColor: "#4169E1" });
  });

  it("renders without crashing", () => {
    expect(() => render(<BadgeCard badge={mockBadge} />)).not.toThrow();
  });
});
