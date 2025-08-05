// New: v1/frontend/src/components/__tests__/FactoryReset.test.tsx

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import FactoryReset from '../../../pages/settings/FactoryReset';
import { useAuth } from '../../../context/AuthContext';
import * as resetService from '../../../services/resetService';
import { message } from 'antd';

jest.mock('../../../context/AuthContext');
jest.mock('../../../services/resetService');
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: { success: jest.fn(), error: jest.fn() },
}));

describe('FactoryReset Component', () => {
  const mockRequestResetOTP = jest.spyOn(resetService, 'requestResetOTP');
  const mockConfirmReset = jest.spyOn(resetService, 'confirmReset');

  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { is_super_admin: true },
    });
  });

  test('renders button for super admin', () => {
    const { getByText } = render(<FactoryReset />);
    expect(getByText('Factory Reset')).toBeInTheDocument();
  });

  test('requests OTP on button click', async () => {
    mockRequestResetOTP.mockResolvedValue({});
    const { getByText } = render(<FactoryReset />);
    fireEvent.click(getByText('Factory Reset'));
    await waitFor(() => expect(mockRequestResetOTP).toHaveBeenCalled());
  });

  test('confirms reset with OTP', async () => {
    mockConfirmReset.mockResolvedValue({});
    const { getByPlaceholderText, getByText } = render(<FactoryReset />);
    // Simulate modal open
    fireEvent.change(getByPlaceholderText('OTP'), { target: { value: '123456' } });
    fireEvent.click(getByText('OK'));
    await waitFor(() => expect(mockConfirmReset).toHaveBeenCalledWith('123456'));
  });
});