import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { createElement } from "react";
import type { ImageProps } from "next/image";
import { afterEach, vi } from "vitest";

vi.mock("next/image", () => ({
  default: (props: ImageProps) => createElement("img", {
    src: typeof props.src === "string" ? props.src : undefined,
    alt: props.alt,
    loading: props.loading,
    onError: props.onError,
  }),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
