import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import NewProjectPage from '../page';
import { createProject } from '../../../../lib/projects.api';

// Mock the API client
jest.mock('../../../../lib/projects.api', () => ({
  createProject: jest.fn(),
}));

// Mock the Providers (AuthProvider, ReactQueryProvider) if needed.
// However, since we are testing the UI, let's see if the page requires router and auth providers.
// We mocked next/navigation in jest.setup.ts.
jest.mock('../../../../providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'user-1', name: 'Test User' },
    isAuthenticated: true,
  }),
}));

describe('NewProjectPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render form fields: Title, Style Preference dropdown, and File Upload zone', () => {
    render(<NewProjectPage />);
    
    expect(screen.getByLabelText(/project title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/art style preference/i)).toBeInTheDocument();
    expect(screen.getByTestId('file-dropzone')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create project/i })).toBeInTheDocument();
  });

  it('should show a validation message if submitting without a title', async () => {
    render(<NewProjectPage />);
    
    const submitBtn = screen.getByRole('button', { name: /create project/i });
    fireEvent.click(submitBtn);
    
    expect(await screen.findByText(/title is required/i)).toBeInTheDocument();
  });

  it('should show a validation message if submitting without a book file', async () => {
    render(<NewProjectPage />);
    
    // Fill title
    fireEvent.change(screen.getByLabelText(/project title/i), {
      target: { value: 'My Book Project' },
    });
    
    const submitBtn = screen.getByRole('button', { name: /create project/i });
    fireEvent.click(submitBtn);
    
    expect(await screen.findByText(/book file is required/i)).toBeInTheDocument();
  });

  it('should reject non-.txt files with an error message', async () => {
    render(<NewProjectPage />);
    
    const fileInput = screen.getByTestId('file-input');
    const file = new File(['hello'], 'book.pdf', { type: 'application/pdf' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    expect(await screen.findByText(/only .txt files are allowed/i)).toBeInTheDocument();
  });

  it('should accept .txt files, showing the file name', async () => {
    render(<NewProjectPage />);
    
    const fileInput = screen.getByTestId('file-input');
    const file = new File(['Once upon a time...'], 'book.txt', { type: 'text/plain' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    expect(screen.getByText('book.txt')).toBeInTheDocument();
    expect(screen.queryByText(/only .txt files are allowed/i)).not.toBeInTheDocument();
  });

  it('should show custom text input when "Custom" style is selected', async () => {
    render(<NewProjectPage />);
    
    const dropdown = screen.getByLabelText(/art style preference/i);
    fireEvent.change(dropdown, { target: { value: 'Custom' } });
    
    expect(screen.getByLabelText(/custom art style/i)).toBeInTheDocument();
  });

  it('should call the API with the correct payload structure (using FormData) when submitted', async () => {
    (createProject as jest.Mock).mockResolvedValue({ id: 'project-123' });
    render(<NewProjectPage />);
    
    // Fill Title
    fireEvent.change(screen.getByLabelText(/project title/i), {
      target: { value: 'Alice' },
    });
    
    // Select Style
    fireEvent.change(screen.getByLabelText(/art style preference/i), {
      target: { value: 'Anime' },
    });
    
    // Select File
    const fileInput = screen.getByTestId('file-input');
    const file = new File(['Alice in Wonderland content'], 'alice.txt', { type: 'text/plain' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // Click Submit
    const submitBtn = screen.getByRole('button', { name: /create project/i });
    fireEvent.click(submitBtn);
    
    await waitFor(() => {
      expect(createProject).toHaveBeenCalledTimes(1);
    });
    
    const calledFormData = (createProject as jest.Mock).mock.calls[0][0];
    expect(calledFormData instanceof FormData).toBe(true);
    expect(calledFormData.get('title')).toBe('Alice');
    expect(calledFormData.get('style')).toBe('Anime');
    expect(calledFormData.get('file')).toEqual(file);
  });
});
