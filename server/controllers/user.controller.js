import User from "../models/User.js";
import Follow from "../models/Follow.js";
import AllPost from "../models/AllPosts.js";
import Comment from "../models/Comment.js";
import Like from "../models/Like.js";
import bcrypt from "bcryptjs";
import { deletePostAndAssets } from "../services/deletePost.js";
import Session from "../models/Session.js";

export const updateMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ ALLOWED FIELDS ONLY
    const allowedUpdates = [
      "username",
      "bio",
      "avatar",
      "banner",
      "socials",
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getProfileByUsername = async (req, res) => {
  try {
    const { username } = req.params;
    const currentUserId = req.user?._id; 

    const user = await User.findOne({ username })
      .select("username avatar banner bio socials")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let isFollowing = false;

    if (currentUserId) {
      const exists = await Follow.exists({
        follower: currentUserId,
        following: user._id,
      });

      isFollowing = !!exists;
    }

    res.status(200).json({
      ...user,
      isFollowing, // ✅ ADD THIS
    });

  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


export const updatePassword = async (
  req,
  res
) => {
  try {
    const {
      currentPassword,
      newPassword
    } = req.body;

    const user = await User.findById(
      req.user.id
    ).select("+password");

    if (!user) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    if (user.isGoogleUser) {
      return res.status(400).json({
        error:
          "Google accounts do not have passwords"
      });
    }

    const isMatch =
      await bcrypt.compare(
        currentPassword,
        user.password
      );

    if (!isMatch) {
      return res.status(400).json({
        error:
          "Incorrect current password"
      });
    }

    const salt =
      await bcrypt.genSalt(10);

    user.password =
      await bcrypt.hash(
        newPassword,
        salt
      );

    await user.save();

    res.json({
      message:
        "Password updated successfully"
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Server error"
    });
  }
};

export const deleteAccount =
  async (req, res) => {
    try {
      const userId =
        req.user.id;

      const posts =
        await AllPost.find({
          user: userId,
        });

      await Promise.all(
        posts.map(post =>
          deletePostAndAssets(post)
        )
      );

      await Promise.all([
        Comment.deleteMany({
          user: userId,
        }),

        Like.deleteMany({
          user: userId,
        }),

        Session.deleteMany({
          user: userId,
        }),

        Follow.deleteMany({
          $or: [
            {
              follower: userId,
            },
            {
              following:
                userId,
            },
          ],
        }),


        User.findByIdAndDelete(
          userId
        ),
      ]);

      res.clearCookie(
        "token"
      );

      res.json({
        message:
          "Account deleted successfully",
      });

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error:
          "Failed to delete account",
      });
    }
  };