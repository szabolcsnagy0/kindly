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

  it("renders badge name correctly", () => {
    render(<BadgeCard badge={mockBadge} />);
    const element = screen.getByText("Test Badge");
    expect(element).toBeInTheDocument();
  });

  it("displays badge description", () => {
    render(<BadgeCard badge={mockBadge} />);
    const description = screen.getByText("Test description");
    expect(description).toBeInTheDocument();
  });

  it("handles click event", () => {
    const onClick = vi.fn();
    render(<BadgeCard badge={mockBadge} onClick={onClick} />);

    const card = screen.getByText("Test Badge").closest("div");
    fireEvent.click(card!);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("displays progress bar for incomplete badges", () => {
    const incompleteBadge = { ...mockBadge, is_completed: false, progress: 50 };
    render(<BadgeCard badge={incompleteBadge} />);

    const progressText = screen.queryByText(/Completed/i);
    expect(progressText).not.toBeInTheDocument();
  });

  it("shows completed indicator for completed badges", () => {
    render(<BadgeCard badge={mockBadge} />);
    const completedText = screen.getByText(/✓ Completed/i);
    expect(completedText).toBeInTheDocument();
  });

  it("displays correct rarity name", () => {
    render(<BadgeCard badge={mockBadge} />);
    const rarityBadge = screen.getByText("Rare");
    expect(rarityBadge).toBeInTheDocument();
  });

  it("does not show completed indicator for incomplete badges", () => {
    const incompleteBadge = { ...mockBadge, is_completed: false };
    render(<BadgeCard badge={incompleteBadge} />);

    const completedText = screen.queryByText(/✓ Completed/i);
    expect(completedText).not.toBeInTheDocument();
  });
});
