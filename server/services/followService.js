import Follow from "../models/Follow.js";
import User from "../models/User.js";
import redis from "../config/redis.js";
import mongoose from "mongoose";
class FollowService {
  static async followUser(followerId, followingId) {
    if (!mongoose.Types.ObjectId.isValid(followerId) || !mongoose.Types.ObjectId.isValid(followingId))
      throw new Error("Invalid user ID");

    if (followerId === followingId) throw new Error("Cannot follow yourself");

    try {
      // ✅ Atomic via unique index
      const follow = await Follow.create({
        follower: followerId,
        following: followingId,
      });

      // ✅ Non-blocking counter updates
      User.updateOne({ _id: followerId }, { $inc: { followingCount: 1 } }).exec();
      User.updateOne({ _id: followingId }, { $inc: { followersCount: 1 } }).exec();

      // ✅ Cache updates async
      redis.sAdd(`user:${followerId}:following`, followingId);
      redis.sAdd(`user:${followingId}:followers`, followerId);
      redis.del(`followersCount:${followingId}`);
      redis.del(`followingCount:${followerId}`);
      redis.del(`suggested:${followerId}`);

      return follow;

    } catch (error) {
      if (error.code === 11000) {
        throw new Error("Already following");
      }
      throw error;
    }
  }
  static async unfollowUser(followerId, followingId) {
    const deleted = await Follow.findOneAndDelete({
      follower: followerId,
      following: followingId,
    });

    if (!deleted) throw new Error("Not following");

    // ✅ async counters
    User.updateOne({ _id: followerId }, { $inc: { followingCount: -1 } }).exec();
    User.updateOne({ _id: followingId }, { $inc: { followersCount: -1 } }).exec();

    // ✅ async cache
    redis.sRem(`user:${followerId}:following`, followingId);
    redis.sRem(`user:${followingId}:followers`, followerId);
    redis.del(`followersCount:${followingId}`);
    redis.del(`followingCount:${followerId}`);
    redis.del(`suggested:${followerId}`);

    return true;
  }

  // --- Read-only methods below do not need transactions ---

  static async getFollowers(userId, page = 1, limit = 20) {

    const skip = (page - 1) * limit;

    const docs = await Follow.find({ following: userId })
      .populate("follower", "username avatar displayName")
      .select("follower -_id")
      .skip(skip)
      .limit(limit);

    const followers = docs
      .map(d => d.follower)
      .filter(Boolean);

    const total = await Follow.countDocuments({ following: userId });

    return {
      followers,
      total,
      page,
      hasMore: skip + followers.length < total
    };
  }

  static async getFollowing(userId, page = 1, limit = 20) {

    const skip = (page - 1) * limit;

    const docs = await Follow.find({ follower: userId })
      .populate("following", "username avatar displayName")
      .select("following -_id")
      .skip(skip)
      .limit(limit);

    const following = docs
      .map(d => d.following)
      .filter(Boolean);

    const total = await Follow.countDocuments({ follower: userId });

    return {
      following,
      total,
      page,
      hasMore: skip + following.length < total
    };
  }

  static async getFollowersCount(userId) {
    const cacheKey = `followersCount:${userId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return parseInt(cached, 10);

    const count = await Follow.countDocuments({ following: userId });
    await redis.set(cacheKey, count, { EX: 120 }); // cache 2 min
    return count;
  }

  static async getFollowingCount(userId) {
    const cacheKey = `followingCount:${userId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return parseInt(cached, 10);

    const count = await Follow.countDocuments({ follower: userId });
    await redis.set(cacheKey, count, { EX: 120 }); // cache 2 min
    return count;
  }

static async getSuggestedUsers(userId) {
  const cacheKey = `suggested:${userId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const LIMIT = 7;

  // Get users the current user is already following
  const following = await Follow.find({ follower: userId }).select("following");
  const followingSet = new Set(following.map(f => f.following.toString()));

  // Exclude current user and already followed users
  const excludeIds = [...followingSet, userId].map(
    id => new mongoose.Types.ObjectId(id)
  );

  // First, randomly select users WITH profile photos
  const usersWithAvatar = await User.aggregate([
    {
      $match: {
        _id: { $nin: excludeIds },
        avatar: {
          $exists: true,
          $nin: ["", null],
        },
      },
    },
    { $sample: { size: LIMIT } },
    {
      $project: {
        _id: 1,
        username: 1,
        avatar: 1,
        displayName: 1,
      },
    },
  ]);

  let suggested = usersWithAvatar;

  // Fill remaining slots with users without profile photos
  if (suggested.length < LIMIT) {
    const remaining = LIMIT - suggested.length;

    const usersWithoutAvatar = await User.aggregate([
      {
        $match: {
          _id: {
            $nin: [
              ...excludeIds,
              ...usersWithAvatar.map(user => user._id),
            ],
          },
          $or: [
            { avatar: "" },
            { avatar: null },
            { avatar: { $exists: false } },
          ],
        },
      },
      { $sample: { size: remaining } },
      {
        $project: {
          _id: 1,
          username: 1,
          avatar: 1,
          displayName: 1,
        },
      },
    ]);

    suggested = [...usersWithAvatar, ...usersWithoutAvatar];

    // Fisher-Yates shuffle
    for (let i = suggested.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [suggested[i], suggested[j]] = [suggested[j], suggested[i]];
    }
  }

  const enriched = suggested.map(user => ({
    ...user,
    isFollowing: false,
  }));

  // Cache for 2 minutes
  if (enriched.length > 0) {
    await redis.set(cacheKey, JSON.stringify(enriched), { EX: 120 });
  }

  return enriched;
}
}

export default FollowService;