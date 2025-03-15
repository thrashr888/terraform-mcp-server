// Mock implementation of responseUtils
export const createStandardResponse = jest.fn().mockImplementation((status, content, data) => ({
  status,
  content,
  data
}));

export const handleToolError = jest.fn().mockImplementation((error) => {
  throw error;
});

export const formatAsMarkdown = jest.fn().mockImplementation((content) => content);
export const formatUrl = jest.fn().mockImplementation((url) => url);
export const addStandardContext = jest.fn().mockImplementation((data, context) => ({ ...data, context }));
