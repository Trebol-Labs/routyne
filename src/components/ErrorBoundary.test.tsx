import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function Bomb(): never {
  throw new Error('Test explosion');
}

beforeAll(() => {
  // Suppress React's console.error for expected boundary catches
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  vi.restoreAllMocks();
});

it('renders fallback UI when child throws', () => {
  render(<ErrorBoundary><Bomb /></ErrorBoundary>);
  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
});

it('renders children when no error', () => {
  render(<ErrorBoundary><p>Healthy</p></ErrorBoundary>);
  expect(screen.getByText('Healthy')).toBeInTheDocument();
});
