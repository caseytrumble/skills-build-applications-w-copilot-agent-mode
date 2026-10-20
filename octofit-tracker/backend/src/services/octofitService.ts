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
  const rawMembers = data.members === undefined ? [] : data.members;

  if (!name || !mascot) {
    throw Object.assign(new Error('Team name and mascot are required.'), { status: 400 });
  }
  if (!Array.isArray(rawMembers)) {
    throw Object.assign(new Error('Team members must be an array of existing user IDs.'), { status: 400 });
  }

  const members = rawMembers.map((member) => typeof member === 'string' ? member.trim() : '');
  if (members.some((member) => !mongoose.isValidObjectId(member))) {
    throw Object.assign(new Error('Team members must be valid MongoDB ObjectIds.'), { status: 400 });
  }
  const uniqueMembers = [...new Set(members)];
  if (uniqueMembers.length > 0 && await User.countDocuments({ _id: { $in: uniqueMembers } }) !== uniqueMembers.length) {
    throw Object.assign(new Error('Team members must reference existing users.'), { status: 400 });
  }

  const team = await Team.create({ name, mascot, members });
  return team.toJSON();
}

export async function getLeaderboard() {
  const grouped = await Activity.aggregate([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
  ]);

  const teams = await Team.find().sort({ name: 1, _id: 1 }).lean();
  const pointsByTeam = new Map(grouped.map(({ _id, totalPoints }) => [_id.toString(), totalPoints]));

  return teams
    .map((team) => ({
      id: team._id.toString(),
      teamName: team.name,
      totalPoints: pointsByTeam.get(team._id.toString()) ?? 0,
    }))
    .sort((left, right) => right.totalPoints - left.totalPoints || left.teamName.localeCompare(right.teamName) || left.id.localeCompare(right.id))
    .map((entry, index) => ({
    teamName: entry.teamName,
    totalPoints: entry.totalPoints,
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

  if (workouts.length === 0) return [];

  return workouts.map((workout) => ({
    ...workout,
    reason: user.fitnessGoal
      ? `Your ${user.fitnessGoal} fitness goal supports a ${focus}-focused routine like ${workout.title}.`
      : `Your recent ${latestActivity?.type ?? 'activity'} supports a ${focus}-focused routine like ${workout.title}.`,
  }));
}

export { User };
