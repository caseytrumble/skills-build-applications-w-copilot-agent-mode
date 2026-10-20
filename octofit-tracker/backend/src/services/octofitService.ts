import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function listActivities() {
  return Activity.find().sort({ occurredAt: -1 }).lean();
}

export async function createActivity(input: unknown) {
  const data = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;
  const userId = String(data.userId ?? '').trim();
  const teamId = String(data.teamId ?? '').trim();
  const type = String(data.type ?? '').trim();
  const minutes = Number(data.minutes ?? NaN);

  if (!userId || !teamId || !type || !Number.isFinite(minutes) || minutes <= 0) {
    throw Object.assign(new Error('Activity requires userId, teamId, type, and a positive minutes value.'), { status: 400 });
  }
  if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(teamId)) {
    throw Object.assign(new Error('Activity userId and teamId must be valid MongoDB ObjectIds.'), { status: 400 });
  }

  const [user, team] = await Promise.all([
    User.findById(userId).lean(),
    Team.findById(teamId).lean(),
  ]);

  if (!user || !team) {
    throw Object.assign(new Error('Activity references an unknown user or team.'), { status: 400 });
  }

  const created = await Activity.create({
    user: userId,
    team: teamId,
    type,
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });

  return created.toJSON();
}

export async function listTeams() {
  return Team.find().sort({ name: 1 }).lean();
}

export async function createTeam(input: unknown) {
  const data = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;
  const name = String(data.name ?? '').trim();
  const mascot = String(data.mascot ?? '').trim();
  const rawMembers = Array.isArray(data.members) ? data.members : [];

  if (!name || !mascot) {
    throw Object.assign(new Error('Team name and mascot are required.'), { status: 400 });
  }

  const members = (rawMembers as Array<string | { toString(): string }> )
    .map((member) => (typeof member === 'string' ? member : member?.toString?.() ?? ''))
    .filter((member) => member.length > 0 && mongoose.isValidObjectId(member));

  const team = await Team.create({ name, mascot, members });
  return team.toJSON();
}

export async function getLeaderboard() {
  const grouped = await Activity.aggregate([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    { $sort: { totalPoints: -1, _id: 1 } },
  ]);

  const teamIds = grouped.map(({ _id }) => _id);
  const teams = await Team.find({ _id: { $in: teamIds } }).lean();
  const teamMap = new Map(teams.map((team) => [team._id.toString(), team.name]));

  return grouped.map(({ _id, totalPoints }, index) => ({
    teamName: teamMap.get(_id.toString()) ?? 'Unknown team',
    totalPoints,
    rank: index + 1,
  }));
}

export async function suggestWorkouts(userEmail: string) {
  const normalizedEmail = normalizeEmail(userEmail);
  const user = await User.findOne({ email: normalizedEmail }).lean();

  if (!user) {
    throw Object.assign(new Error('No matching user was found for the provided email.'), { status: 404 });
  }

  const latestActivity = await Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).lean();
  const focus = user.fitnessGoal || (latestActivity?.type === 'strength' ? 'strength' : 'endurance');
  const workouts = await Workout.find({ focus }).sort({ title: 1 }).lean();

  if (workouts.length === 0) {
    const fallback = await Workout.find().sort({ title: 1 }).limit(1).lean();
    if (fallback.length === 0) {
      return [];
    }
    return [{ ...fallback[0], reason: `Your recent ${latestActivity?.type ?? 'activity'} suggests a ${focus}-focused recovery plan.` }];
  }

  return workouts.map((workout) => ({
    ...workout,
    reason: `Your recent ${latestActivity?.type ?? 'activity'} supports a ${focus}-focused routine like ${workout.title}.`,
  }));
}

export { User };
