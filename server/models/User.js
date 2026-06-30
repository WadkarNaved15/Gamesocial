// models/User.js
import mongoose from "mongoose";

// Production-grade username rules:
// - 3 to 20 characters
// - must start with a letter
// - lowercase letters, numbers, and underscores only
// - no consecutive underscores
// - no leading/trailing underscore
export const USERNAME_REGEX =
  /^[a-z](?:[a-z0-9_]{1,19})$/;

export const RESERVED_USERNAMES = [
  "admin",
  "administrator",
  "root",
  "support",
  "help",
  "rigzer",
  "moderator",
  "mod",
  "system",
  "null",
  "undefined",
  "api",
  "settings",
  "official",
];

export function validateUsernameFormat(username) {
  if (typeof username !== "string") return "Username is required";
  const u = username.trim();

  if (u.length < 3 || u.length > 20) {
    return "Username must be 3-20 characters";
  }
  if (!/^[a-z]/.test(u)) {
    return "Username must start with a letter";
  }
  if (/\s/.test(u)) {
    return "Username cannot contain spaces";
  }
  if (/__/.test(u)) {
    return "Username cannot contain consecutive underscores";
  }
  if (!USERNAME_REGEX.test(u)) {
    return "Only lowercase letters, numbers, and underscores are allowed";
  }
  if (RESERVED_USERNAMES.includes(u)) {
    return "This username is reserved";
  }
  return null; // valid
}

export function calculateAge(birthdate) {
  const dob = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export const MIN_AGE = 13;

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          return validateUsernameFormat(v) === null;
        },
        message: (props) =>
          validateUsernameFormat(props.value) || "Invalid username",
      },
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 30,
    },
    email: { type: String, unique: true, required: true, lowercase: true },
    password: {
      type: String,
      required: function () {
        return !this.isGoogleUser;
      },
      select: false,
    },
    birthdate: {
      type: Date,
      required: function () {
        return !this.isGoogleUser;
      },
      validate: {
        validator: function (v) {
          // Allow missing birthdate only for Google users who haven't backfilled yet
          if (!v) return this.isGoogleUser === true;
          return calculateAge(v) >= MIN_AGE;
        },
        message: `You must be at least ${MIN_AGE} years old to register`,
      },
    },
    isGoogleUser: { type: Boolean, default: false },
    avatar: { type: String, default: "" },
    banner: { type: String, default: "" },
    bio: { type: String, maxlength: 160, default: "" },
    socials: {
      twitter: String,
      instagram: String,
      youtube: String,
      discord: String,
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