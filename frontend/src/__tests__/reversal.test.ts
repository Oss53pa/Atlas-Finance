import { describe, it, expect } from 'vitest';
import { isEntryEditable, isEntryReversible } from '../utils/reversalService';

describe('isEntryEditable', () => {
  it('draft entries are editable', () => {
    expect(isEntryEditable('draft')).toBe(true);
  });

  it('validated entries are NOT editable', () => {
    expect(isEntryEditable('validated')).toBe(false);
  });

  it('posted entries are NOT editable', () => {
    expect(isEntryEditable('posted')).toBe(false);
  });
});

describe('isEntryReversible', () => {
  it('validated entries can be reversed', () => {
    expect(isEntryReversible({ status: 'validated' })).toBe(true);
  });

  it('posted entries can be reversed', () => {
    expect(isEntryReversible({ status: 'posted' })).toBe(true);
  });

  it('draft entries cannot be reversed', () => {
    expect(isEntryReversible({ status: 'draft' })).toBe(false);
  });

  it('already reversed entries cannot be reversed again', () => {
    expect(isEntryReversible({ status: 'validated', reversed: true })).toBe(false);
  });
});
