// Global mock helpers for testing
// This file provides both type definitions and implementations

// Mock state storage
const mockResponses: any[] = [];
const fetchCalls: Array<{ url: string; options?: RequestInit }> = [];

/**
 * Reset all fetch mock state
 */
export function resetFetchMocks(): void {
  mockResponses.length = 0;
  fetchCalls.length = 0;
}

/**
 * Mock a successful fetch response
 */
export function mockFetchResponse(response: Partial<Response>): void {
  mockResponses.push(response);
}

/**
 * Mock a fetch rejection
 */
export function mockFetchRejection(error: Error | string): void {
  mockResponses.push({ error });
}

/**
 * Get the history of fetch calls
 */
export function getFetchCalls(): Array<{ url: string; options?: RequestInit }> {
  return [...fetchCalls];
}

// Mock fetch globally
global.fetch = function mockFetch(input: RequestInfo | URL, init?: RequestInit) {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  fetchCalls.push({ url, options: init });

  const mockResponse = mockResponses.shift();
  if (!mockResponse) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve("")
    } as Response);
  }

  if (mockResponse.error) {
    return Promise.reject(mockResponse.error);
  }

  return Promise.resolve(mockResponse as Response);
};

// Mock console.error to avoid polluting test output
global.console.error = function () {};
