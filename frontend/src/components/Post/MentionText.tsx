import { Link } from "react-router-dom";

const regex = /@([a-z0-9_]+)/gi;

type Mention = {
  user: {
    _id: string;
    username: string;
    displayName: string;
    avatar: string;
  };
  originalUsername: string;
};

type MentionTextProps = {
  text: string;
  mentions?: Mention[];
};

export default function MentionText({
  text,
  mentions = [],
}: MentionTextProps) {
  const mentionMap = new Map(
    mentions.map((m) => [
      m.originalUsername.toLowerCase(),
      m.user,
    ])
  );
  
  return (
    <>
      {text.split(regex).map((part, index) => {
        // Even indices are normal text chunks
        if (index % 2 === 0) {
          return <span key={index}>{part}</span>;
        }

        // Special @interact mention
        if (part.toLowerCase() === "interact") {
          return (
            <span
              key={index}
              className="text-[rgb(98,212,174)] font-semibold transition-all"
            >
              @interact
            </span>
          );
        }

        const user = mentionMap.get(part.toLowerCase());

        // Unresolved mention (user not found in the mentions array)
        if (!user) {
          return (
            <span
              key={index}
              className="text-[rgb(98,212,174)] font-semibold transition-all"
            >
              @{part}
            </span>
          );
        }

        // Resolved mention with Link
        return (
          <Link
            key={user._id}
            to={`/profile/${user.username}`}
            className="text-[rgb(98,212,174)] font-semibold hover:underline transition-all"
          >
            @{user.username}
          </Link>
        );
      })}
    </>
  );
}