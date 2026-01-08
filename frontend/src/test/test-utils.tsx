import { render as rtlRender } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import system from "../theme";
import type { ReactElement } from "react";
import type { RenderOptions } from "@testing-library/react";

/**
 * Custom render function that wraps components in ChakraProvider
 * This ensures all Chakra UI components have access to the theme context
 */
export function render(ui: ReactElement, options?: RenderOptions) {
  return rtlRender(<ChakraProvider value={system}>{ui}</ChakraProvider>, options);
}

// Re-export everything from testing-library
export * from "@testing-library/react";
