import { diffDays } from '../utils/dates.js';

/** Update workout streak after a completed session. Mutates user (not saved). */
export function updateStreak(user, when = new Date()) {
  const last = user.streak?.lastWorkoutDate;
  if (!user.streak) user.streak = { current: 0, longest: 0 };
  if (!last) {
    user.streak.current = 1;
  } else {
    const gap = diffDays(when, last);
    if (gap === 1) user.streak.current += 1;
    else if (gap > 1) user.streak.current = 1;
    // gap === 0: same day, unchanged
  }
  user.streak.longest = Math.max(user.streak.longest || 0, user.streak.current);
  user.streak.lastWorkoutDate = when;
}

/** Streak is broken if the last workout was more than 1 day ago. */
export function effectiveStreak(user) {
  const last = user.streak?.lastWorkoutDate;
  if (!last) return 0;
  return diffDays(new Date(), last) > 1 ? 0 : user.streak.current;
}
