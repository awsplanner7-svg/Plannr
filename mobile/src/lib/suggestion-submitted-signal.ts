/**
 * Lightweight cross-screen signal used to communicate that a suggestion was
 * just submitted.  The add-suggestion screen sets the flag before calling
 * router.back(); the board detail screen reads and clears it on focus.
 */

let _pending = false;

export function markSuggestionSubmitted() {
  _pending = true;
}

export function consumeSuggestionSubmitted(): boolean {
  if (_pending) {
    _pending = false;
    return true;
  }
  return false;
}
