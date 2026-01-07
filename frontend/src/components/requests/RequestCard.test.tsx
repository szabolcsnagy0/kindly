import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "../../test/test-utils";
import { RequestCard } from "./RequestCard";
import { RequestStatus, ApplicationStatus } from "../../types";
import type { Request, VolunteerRequest } from "../../types";

// Mock the date utilities
vi.mock("../../utils/date", async () => {
  const actual = await vi.importActual("../../utils/date");
  return {
    ...actual,
    isPastDate: vi.fn(),
  };
});

import { isPastDate } from "../../utils/date";

describe("RequestCard", () => {
  const mockNow = new Date("2025-01-15T12:00:00Z").getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  const baseRequest: Request = {
    id: 1,
    name: "Help with groceries",
    description: "Need help carrying groceries from the store",
    longitude: -122.4194,
    latitude: 37.7749,
    address: "123 Main St, San Francisco, CA",
    start: "2025-01-20T10:00:00Z",
    end: "2025-01-20T12:00:00Z",
    reward: 25,
    request_types: [
      { id: 1, name: "Shopping" },
      { id: 2, name: "Transport" },
    ],
    application_count: 3,
    created_at: "2025-01-10T08:00:00Z",
    updated_at: "2025-01-10T08:00:00Z",
    status: RequestStatus.OPEN,
    has_rated_seeker: false,
  };

  describe("date color dimming", () => {
    it("should render past dates with gray.400 color", () => {
      const pastRequest = {
        ...baseRequest,
        start: "2025-01-01T10:00:00Z", // Past date
      };

      vi.mocked(isPastDate).mockReturnValue(true);

      render(<RequestCard request={pastRequest} isVolunteer={true} />);

      // Find the date text element
      const dateText = screen.getByText(/Jan 1, 2025/i);

      // Check that the text has the dimmed color (gray.400)
      expect(dateText).toHaveStyle({ color: "var(--chakra-colors-gray-400)" });

      // Verify isPastDate was called with the correct date
      expect(isPastDate).toHaveBeenCalledWith("2025-01-01T10:00:00Z");
    });

    it("should render future dates with gray.500 color", () => {
      const futureRequest = {
        ...baseRequest,
        start: "2025-12-31T10:00:00Z", // Future date
      };

      vi.mocked(isPastDate).mockReturnValue(false);

      render(<RequestCard request={futureRequest} isVolunteer={true} />);

      // Find the date text element
      const dateText = screen.getByText(/Dec 31, 2025/i);

      // Check that the text has the normal color (gray.500)
      expect(dateText).toHaveStyle({ color: "var(--chakra-colors-gray-500)" });

      // Verify isPastDate was called with the correct date
      expect(isPastDate).toHaveBeenCalledWith("2025-12-31T10:00:00Z");
    });

    it("should handle Date objects for past dates", () => {
      const pastDateObj = new Date("2024-06-15T10:00:00Z");
      const requestWithDateObj = {
        ...baseRequest,
        start: pastDateObj.toISOString(),
      };

      vi.mocked(isPastDate).mockReturnValue(true);

      render(<RequestCard request={requestWithDateObj} isVolunteer={false} />);

      const dateText = screen.getByText(/Jun 15, 2024/i);
      expect(dateText).toHaveStyle({ color: "var(--chakra-colors-gray-400)" });
    });

    it("should handle boundary case - current time", () => {
      const currentTimeRequest = {
        ...baseRequest,
        start: new Date(mockNow).toISOString(),
      };

      vi.mocked(isPastDate).mockReturnValue(false);

      render(
        <RequestCard request={currentTimeRequest} isVolunteer={true} />
      );

      const dateText = screen.getByText(/Jan 15, 2025/i);
      expect(dateText).toHaveStyle({ color: "var(--chakra-colors-gray-500)" });
    });
  });

  describe("rendering consistency", () => {
    it("should render all request information correctly with past date", () => {
      vi.mocked(isPastDate).mockReturnValue(true);

      render(<RequestCard request={baseRequest} isVolunteer={true} />);

      // Check all elements are present
      expect(screen.getByText(baseRequest.name)).toBeInTheDocument();
      expect(
        screen.getByText(baseRequest.description, { exact: false })
      ).toBeInTheDocument();
      expect(screen.getByText("Shopping")).toBeInTheDocument();
      expect(screen.getByText("Transport")).toBeInTheDocument();
      expect(screen.getByText("$25")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("should render all request information correctly with future date", () => {
      vi.mocked(isPastDate).mockReturnValue(false);

      render(<RequestCard request={baseRequest} isVolunteer={false} />);

      // Check all elements are present
      expect(screen.getByText(baseRequest.name)).toBeInTheDocument();
      expect(
        screen.getByText(baseRequest.description, { exact: false })
      ).toBeInTheDocument();
    });
  });

  describe("different request statuses with date colors", () => {
    it("should apply date color for open requests with past dates", () => {
      const openPastRequest = {
        ...baseRequest,
        status: RequestStatus.OPEN,
        start: "2024-01-01T10:00:00Z",
      };

      vi.mocked(isPastDate).mockReturnValue(true);

      render(<RequestCard request={openPastRequest} isVolunteer={true} />);

      const dateText = screen.getByText(/Jan 1, 2024/i);
      expect(dateText).toHaveStyle({ color: "var(--chakra-colors-gray-400)" });
    });

    it("should apply date color for completed requests with past dates", () => {
      const completedRequest = {
        ...baseRequest,
        status: RequestStatus.COMPLETED,
        start: "2024-06-01T10:00:00Z",
      };

      vi.mocked(isPastDate).mockReturnValue(true);

      render(<RequestCard request={completedRequest} isVolunteer={true} />);

      const dateText = screen.getByText(/Jun 1, 2024/i);
      expect(dateText).toHaveStyle({ color: "var(--chakra-colors-gray-400)" });
    });

    it("should apply date color for closed requests with future dates", () => {
      const closedRequest: VolunteerRequest = {
        ...baseRequest,
        status: RequestStatus.CLOSED,
        application_status: ApplicationStatus.NOT_APPLIED,
        start: "2025-06-01T10:00:00Z",
      };

      vi.mocked(isPastDate).mockReturnValue(false);

      render(<RequestCard request={closedRequest} isVolunteer={true} />);

      const dateText = screen.getByText(/Jun 1, 2025/i);
      expect(dateText).toHaveStyle({ color: "var(--chakra-colors-gray-500)" });
    });
  });
});
