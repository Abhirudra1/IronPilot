import { Achievement, Notification, WorkoutLog } from '../models/index.js';

export const ACHIEVEMENT_CATALOG = [
  { key: 'first_workout', title: 'First Workout', description: 'Complete your very first workout session.', icon: '🎯', points: 50, category: 'workout', criteria: { metric: 'totalWorkouts', threshold: 1 } },
  { key: 'first_week', title: 'First Week Completed', description: 'Train for a full week.', icon: '📅', points: 100, category: 'streak', criteria: { metric: 'currentStreak', threshold: 7 } },
  { key: 'streak_7', title: '7 Day Streak', description: 'Work out 7 days in a row.', icon: '🔥', points: 150, category: 'streak', criteria: { metric: 'longestStreak', threshold: 7 } },
  { key: 'streak_30', title: '30 Day Streak', description: 'Work out 30 days in a row.', icon: '🌋', points: 500, category: 'streak', criteria: { metric: 'longestStreak', threshold: 30 } },
  { key: 'workouts_10', title: '10 Workouts', description: 'Complete 10 workouts.', icon: '💪', points: 100, category: 'workout', criteria: { metric: 'totalWorkouts', threshold: 10 } },
  { key: 'workouts_50', title: '50 Workouts', description: 'Complete 50 workouts.', icon: '🏋️', points: 300, category: 'workout', criteria: { metric: 'totalWorkouts', threshold: 50 } },
  { key: 'workouts_100', title: '100 Workouts', description: 'Complete 100 workouts.', icon: '🏆', points: 1000, category: 'workout', criteria: { metric: 'totalWorkouts', threshold: 100 } },
  { key: 'hours_10', title: '10 Hours Trained', description: 'Accumulate 10 hours of training.', icon: '⏱️', points: 150, category: 'volume', criteria: { metric: 'totalWorkoutMinutes', threshold: 600 } },
  { key: 'hours_100', title: '100 Hours Trained', description: 'Accumulate 100 hours of training.', icon: '⚡', points: 1000, category: 'volume', criteria: { metric: 'totalWorkoutMinutes', threshold: 6000 } },
  { key: 'volume_10k', title: '10,000 kg Lifted', description: 'Lift a cumulative 10,000 kg.', icon: '🐘', points: 200, category: 'volume', criteria: { metric: 'totalVolume', threshold: 10000 } },
  { key: 'goal_reached', title: 'Goal Reached', description: 'Hit your target weight.', icon: '🥇', points: 500, category: 'weight', criteria: { metric: 'goalReached', threshold: 1 } },
  { key: 'hydration_hero', title: 'Hydration Hero', description: 'Hit your water goal 7 days in a row.', icon: '💧', points: 100, category: 'nutrition', criteria: { metric: 'waterStreak', threshold: 7 } },
];

export function levelForPoints(points) {
  // Level n requires 100 * n^2 points
  let level = 1;
  while (points >= 100 * (level + 1) ** 2) level++;
  return level;
}

function goalReached(user) {
  if (!user.targetWeight || !user.currentWeight || !user.weight) return 0;
  const losing = user.weight >= user.targetWeight;
  return (losing ? user.currentWeight <= user.targetWeight : user.currentWeight >= user.targetWeight) ? 1 : 0;
}

/** Evaluate and award any newly earned achievements. Mutates & saves user. */
export async function evaluateAchievements(user, extra = {}) {
  const catalog = await Achievement.find({ isActive: true }).lean();
  const earnedKeys = new Set((user.achievements || []).map((a) => a.key));

  let totalVolume = extra.totalVolume;
  if (totalVolume == null && catalog.some((a) => a.criteria?.metric === 'totalVolume' && !earnedKeys.has(a.key))) {
    const agg = await WorkoutLog.aggregate([{ $match: { user: user._id } }, { $group: { _id: null, v: { $sum: '$volume' } } }]);
    totalVolume = agg[0]?.v || 0;
  }

  const metrics = {
    totalWorkouts: user.totalWorkouts,
    totalWorkoutMinutes: user.totalWorkoutMinutes,
    currentStreak: user.streak?.current || 0,
    longestStreak: user.streak?.longest || 0,
    totalVolume: totalVolume || 0,
    goalReached: goalReached(user),
    waterStreak: extra.waterStreak || 0,
  };

  const newlyEarned = [];
  for (const a of catalog) {
    if (earnedKeys.has(a.key)) continue;
    const { metric, threshold } = a.criteria || {};
    if (metric && metrics[metric] >= threshold) {
      user.achievements.push({ achievement: a._id, key: a.key, earnedAt: new Date() });
      user.points += a.points;
      newlyEarned.push(a);
    }
  }
  if (newlyEarned.length) {
    user.level = levelForPoints(user.points);
    await user.save();
    await Notification.insertMany(newlyEarned.map((a) => ({
      user: user._id, type: 'achievement', title: `Achievement unlocked: ${a.title}`,
      message: `${a.icon} ${a.description} (+${a.points} pts)`, link: '/achievements',
    })));
  }
  return newlyEarned;
}
