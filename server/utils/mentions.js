import User, {
  RESERVED_USERNAMES,
  validateUsernameFormat,
} from "../models/User.js";

const MENTION_REGEX = /@([a-z0-9_]+)/gi;

const SPECIAL_MENTIONS = new Set([
  "interact",
]);

export function extractMentionNames(text = "") {
  if (!text) return [];

  const usernames = new Set();

  let match;

  while ((match = MENTION_REGEX.exec(text)) !== null) {
    const username = match[1].toLowerCase();

    if (SPECIAL_MENTIONS.has(username)) {
      usernames.add(username);
      continue;
    }

    if (validateUsernameFormat(username) === null) {
      usernames.add(username);
    }
  }

  return [...usernames];
}

export function containsInteractMention(text = "") {
  return /@interact\b/i.test(text);
}

export async function resolveMentionUsers(usernames = []) {
  if (!usernames.length) return [];

  const filtered = usernames.filter(
    (username) =>
      !SPECIAL_MENTIONS.has(username) &&
      !RESERVED_USERNAMES.includes(username)
  );

  if (!filtered.length) return [];

  return User.find({
    username: { $in: filtered },
  })
    .select("_id username displayName avatar")
    .lean();
}

export async function parseMentions(text = "") {
  const usernames = extractMentionNames(text);

  const mentionedUsers = await resolveMentionUsers(usernames);

  const mentions = mentionedUsers.map((user) => ({
    user: user._id,
    originalUsername: user.username,
  }));

  return {
    usernames,
    mentionedUsers,
    mentions,
    hasInteractMention: usernames.includes("interact"),
  };
}

export function replaceMentions(text = "", callback) {
  if (!text) return "";

  return text.replace(
    MENTION_REGEX,
    (fullMatch, username) => {
      username = username.toLowerCase();

      if (
        SPECIAL_MENTIONS.has(username) ||
        validateUsernameFormat(username) === null
      ) {
        return callback(username);
      }

      return fullMatch;
    }
  );
}