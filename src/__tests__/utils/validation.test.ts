import { z } from 'zod';

// Reminder validation schema (same as in create.tsx)
const reminderSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  notes: z.string().max(1000, 'Notes too long').optional(),
  type: z.enum(['time', 'location']),
  triggerAt: z.date().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  locationName: z.string().optional(),
  radius: z.number().min(100).max(5000).optional(),
  triggerOn: z.enum(['enter', 'exit', 'both']).optional(),
  priority: z.enum(['low', 'medium', 'high']),
});

// Password strength calculation (same as in register.tsx)
const getPasswordStrength = (password: string) => {
  if (password.length === 0) return null;
  if (password.length < 6) return { text: 'Weak', color: '#ef4444', width: '25%' };
  if (password.length < 8) return { text: 'Fair', color: '#f59e0b', width: '50%' };
  if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
    return { text: 'Strong', color: '#22c55e', width: '100%' };
  }
  return { text: 'Good', color: '#0ea5e9', width: '75%' };
};

// Email validation regex (same as in register.tsx)
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

describe('Reminder Validation', () => {
  describe('Title validation', () => {
    it('should reject empty title', () => {
      const result = reminderSchema.safeParse({
        title: '',
        type: 'time',
        priority: 'medium',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Title is required');
      }
    });

    it('should accept valid title', () => {
      const result = reminderSchema.safeParse({
        title: 'Buy groceries',
        type: 'time',
        priority: 'medium',
      });
      expect(result.success).toBe(true);
    });

    it('should reject title over 200 characters', () => {
      const result = reminderSchema.safeParse({
        title: 'a'.repeat(201),
        type: 'time',
        priority: 'medium',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Type validation', () => {
    it('should accept time type', () => {
      const result = reminderSchema.safeParse({
        title: 'Test',
        type: 'time',
        priority: 'medium',
      });
      expect(result.success).toBe(true);
    });

    it('should accept location type', () => {
      const result = reminderSchema.safeParse({
        title: 'Test',
        type: 'location',
        priority: 'medium',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid type', () => {
      const result = reminderSchema.safeParse({
        title: 'Test',
        type: 'invalid',
        priority: 'medium',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Location reminder validation', () => {
    it('should accept valid radius', () => {
      const result = reminderSchema.safeParse({
        title: 'Test',
        type: 'location',
        priority: 'medium',
        radius: 200,
      });
      expect(result.success).toBe(true);
    });

    it('should reject radius below 100m', () => {
      const result = reminderSchema.safeParse({
        title: 'Test',
        type: 'location',
        priority: 'medium',
        radius: 50,
      });
      expect(result.success).toBe(false);
    });

    it('should reject radius above 5000m', () => {
      const result = reminderSchema.safeParse({
        title: 'Test',
        type: 'location',
        priority: 'medium',
        radius: 6000,
      });
      expect(result.success).toBe(false);
    });

    it('should accept all trigger types', () => {
      ['enter', 'exit', 'both'].forEach((trigger) => {
        const result = reminderSchema.safeParse({
          title: 'Test',
          type: 'location',
          priority: 'medium',
          triggerOn: trigger,
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Priority validation', () => {
    it('should accept all priority levels', () => {
      ['low', 'medium', 'high'].forEach((priority) => {
        const result = reminderSchema.safeParse({
          title: 'Test',
          type: 'time',
          priority,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid priority', () => {
      const result = reminderSchema.safeParse({
        title: 'Test',
        type: 'time',
        priority: 'urgent',
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Password Strength', () => {
  it('should return null for empty password', () => {
    expect(getPasswordStrength('')).toBeNull();
  });

  it('should return Weak for password under 6 chars', () => {
    const result = getPasswordStrength('12345');
    expect(result?.text).toBe('Weak');
    expect(result?.width).toBe('25%');
  });

  it('should return Fair for password 6-7 chars', () => {
    const result = getPasswordStrength('123456');
    expect(result?.text).toBe('Fair');
    expect(result?.width).toBe('50%');
  });

  it('should return Good for password 8+ chars without uppercase and number', () => {
    const result = getPasswordStrength('abcdefgh');
    expect(result?.text).toBe('Good');
    expect(result?.width).toBe('75%');
  });

  it('should return Strong for password 8+ chars with uppercase and number', () => {
    const result = getPasswordStrength('Abcdefg1');
    expect(result?.text).toBe('Strong');
    expect(result?.width).toBe('100%');
  });

  it('should return Good for password with only uppercase (no number)', () => {
    const result = getPasswordStrength('Abcdefgh');
    expect(result?.text).toBe('Good');
  });

  it('should return Good for password with only number (no uppercase)', () => {
    const result = getPasswordStrength('abcdefg1');
    expect(result?.text).toBe('Good');
  });
});

describe('Email Validation', () => {
  it('should accept valid emails', () => {
    const validEmails = [
      'test@example.com',
      'user.name@domain.org',
      'user+tag@example.co.uk',
      'user123@test.io',
    ];
    validEmails.forEach((email) => {
      expect(isValidEmail(email)).toBe(true);
    });
  });

  it('should reject invalid emails', () => {
    const invalidEmails = [
      'notanemail',
      '@nodomain.com',
      'no@domain',
      'spaces in@email.com',
      'missing@.com',
      '',
    ];
    invalidEmails.forEach((email) => {
      expect(isValidEmail(email)).toBe(false);
    });
  });
});
