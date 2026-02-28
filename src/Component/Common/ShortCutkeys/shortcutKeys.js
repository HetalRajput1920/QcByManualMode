// src/Component/Common/ShortCutkeys/shortcutKeys.js

export const SHORTCUT_KEYS = {
  OPEN_INVOICE_DROPDOWN: '/',
  SELECT_FIRST_INVOICE: 'Enter',
  CLOSE_DROPDOWN: 'Escape',
  LOGOUT: 'l',
  SEARCH_INVOICES: 'f',
  NEXT_INVOICE: 'ArrowDown',
  PREV_INVOICE: 'ArrowUp',
  MARK_PROCESSED: 'p',
  MARK_HOLD: 'h',
  COMPLETE_VERIFICATION: 'c'
};

export const SHORTCUT_DESCRIPTIONS = {
  [SHORTCUT_KEYS.OPEN_INVOICE_DROPDOWN]: 'Open invoice dropdown',
  [SHORTCUT_KEYS.SELECT_FIRST_INVOICE]: 'Select first invoice',
  [SHORTCUT_KEYS.CLOSE_DROPDOWN]: 'Close dropdown',
  [SHORTCUT_KEYS.LOGOUT]: 'Logout',
  [SHORTCUT_KEYS.SEARCH_INVOICES]: 'Search invoices',
  [SHORTCUT_KEYS.NEXT_INVOICE]: 'Navigate to next invoice',
  [SHORTCUT_KEYS.PREV_INVOICE]: 'Navigate to previous invoice',
  [SHORTCUT_KEYS.MARK_PROCESSED]: 'Mark invoice as processed',
  [SHORTCUT_KEYS.MARK_HOLD]: 'Mark invoice as hold',
  [SHORTCUT_KEYS.COMPLETE_VERIFICATION]: 'Complete verification'
};

// Key combinations that should not trigger shortcuts when user is typing
export const IGNORE_SHORTCUT_INPUTS = ['INPUT', 'TEXTAREA', 'SELECT'];

export default SHORTCUT_KEYS;