import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: function () { return !this.isGoogleUser; } }, // Make password optional for Google users
    isGoogleUser: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User; 
