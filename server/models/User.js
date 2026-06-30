// models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String, required: true, trim: true, unique: true
    },
    displayName: {
      type: String,
      trim: true,
      default: "",
      maxlength: 50,
    },
    email: { type: String, unique: true, required: true, lowercase: true },
    password: {
      type: String,
      required: function () {
        return !this.isGoogleUser;
      },
      select: false,
    },
    isGoogleUser: { type: Boolean, default: false },

    avatar: { type: String, default: "" },
    banner: { type: String, default: "" },
    bio: { type: String, maxlength: 160, default: "" },
    location: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },

    website: {
      type: String,
      trim: true,
      default: "",
    },

    birthDate: {
      type: Date,
      default: null,
    },

    jobTitle: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },

    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },


    // Granted manually by admin — only these accounts can create/edit a Pocket.
    // Being verified does NOT automatically grant this.
    isPocketEligible: { type: Boolean, default: false },

    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;