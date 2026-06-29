import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import jwt from "jsonwebtoken";
import User from "./models/User.js";
import dotenv from "dotenv";
import PendingRegistration from "./models/PendingRegistration.js";

dotenv.config();
const url=process.env.BACKEND_URL

async function generateUniqueUsername(base) {
  base = base
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (!base) {
    base = "user";
  }

  while (true) {
    const candidate =
      base +
      Math.floor(1000 + Math.random() * 9000);

    const [userExists, pendingExists] =
      await Promise.all([
        User.exists({ username: candidate }),
        PendingRegistration.exists({
          username: candidate,
        }),
      ]);

    if (!userExists && !pendingExists) {
      return candidate;
    }
  }
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${url}/api/auth/google/callback`,
      
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists
        let user = await User.findOne({ email: profile.emails[0].value });

        if (!user) {
          await PendingRegistration.deleteOne({
            email: profile.emails[0].value,
        });
          // Register new Google user
          user = new User({
            username: await generateUniqueUsername(profile.displayName),
            email: profile.emails[0].value,
            isGoogleUser: true, // Mark as Google user
          });

          await user.save();
        }

        // Generate JWT token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "30d" });
        return done(null, { user, token });
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});
