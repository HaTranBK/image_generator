import '@testing-library/jest-dom';

// Mock useRouter and next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      prefetch: () => null,
      push: jest.fn(),
      replace: jest.fn(),
    };
  },
  usePathname() {
    return '';
  },
}));
