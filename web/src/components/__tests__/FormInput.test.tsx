import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FormInput from '../FormInput';

describe('FormInput', () => {
  describe('onChange callback', () => {
    it('calls onChange with correct value when user types', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(
        <FormInput
          label="Email"
          type="email"
          value=""
          onChange={onChange}
        />
      );

      const input = screen.getByRole('textbox');
      await user.type(input, 'test@example.com');

      expect(onChange).toHaveBeenCalledWith('test@example.com');
    });

    it('calls onChange for each character typed', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(
        <FormInput
          label="Password"
          type="password"
          value=""
          onChange={onChange}
        />
      );

      const input = screen.getByRole('textbox');
      await user.type(input, 'abc');

      expect(onChange).toHaveBeenCalledTimes(3);
      expect(onChange).toHaveBeenNthCalledWith(1, 'a');
      expect(onChange).toHaveBeenNthCalledWith(2, 'ab');
      expect(onChange).toHaveBeenNthCalledWith(3, 'abc');
    });

    it('passes correct input element attributes', () => {
      const onChange = vi.fn();

      render(
        <FormInput
          label="Email"
          type="email"
          value="test@example.com"
          onChange={onChange}
          placeholder="Enter email"
        />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input).toHaveAttribute('type', 'email');
      expect(input).toHaveAttribute('placeholder', 'Enter email');
      expect(input).toHaveValue('test@example.com');
    });

    it('respects disabled state', () => {
      const onChange = vi.fn();

      render(
        <FormInput
          label="Email"
          type="email"
          value=""
          onChange={onChange}
          disabled={true}
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });
  });
});

