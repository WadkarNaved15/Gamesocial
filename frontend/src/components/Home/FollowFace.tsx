import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useUser } from "../../context/user";
import FollowButton from "../FollowButton";
import { useNavigate } from "react-router-dom";

const FollowFace = ({ translateZ, faceAngle }: { translateZ: number; faceAngle: number }) => {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
  const { user } = useUser();
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const prevUserIdRef = useRef<string | null>(null);
  const fetchedRef = useRef(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user?._id) {
      setLoaded(true);
      return;
    }
    if (fetchedRef.current && prevUserIdRef.current === user._id) return;
    prevUserIdRef.current = user._id;
    fetchedRef.current = true;

    const fetchUsers = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/follow/${user._id}/suggested`, { withCredentials: true });
        setUsers(res.data.users || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoaded(true);
      }
    };
    fetchUsers();
  }, [user?._id]);

  if (!loaded) return null;

  return (
    <div
      className="absolute inset-0 face bg-transparent text-white overflow-y-auto backface-hidden"
      style={{ transform: `rotateY(${faceAngle}deg) translateZ(${translateZ}px)` }}
    >
      <div className="h-full px-3 py-2 lg:px-4 lg:py-3 2xl:px-5 2xl:py-4 flex flex-col">
        
        <div className="border border-white/10 rounded-2xl p-4 lg:p-5 w-full flex flex-col bg-transparent">
          
          <h3 className="text-[10px] 2xl:text-[11px] font-bold uppercase tracking-widest text-white/50 mb-4">
            Suggested
          </h3>

          {!user ? (
            <div className="flex flex-col items-center justify-center flex-grow space-y-4 pb-4">
              <div className="space-y-2">
                <p className="text-sm lg:text-base font-bold text-white text-center px-2">
                  Login to follow other users
                </p>
                <p className="text-xs text-white/50 text-center">
                  Join the community to stay updated
                </p>
              </div>
            </div>
          ) : users.length === 0 ? (
            <p className="text-white/50 text-xs pb-2">No users to follow</p>
          ) : (
            <div className="space-y-4 lg:space-y-5 px-2 lg:px-4 2xl:px-8">
              {/* Padding added above (px-2 lg:px-8) to squeeze items closer horizontally */}
              {users.map((u) => (
                <div key={u._id} className="flex justify-between items-center gap-3 group">
                  
                  <div className="flex items-center gap-3 overflow-hidden">
                    <img
                      src={u.avatar || "/default_avatar.png"}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/profile/${u.username}`);
                      }}
                      className="w-9 h-9 lg:w-10 lg:h-10 2xl:w-11 2xl:h-11 rounded-full border border-white/[0.08] object-cover cursor-pointer hover:border-white/20 transition-colors flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate text-xs lg:text-sm text-gray-200 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/profile/${u.username}`);
                        }}
                      >
                        {u.displayName || u.username}
                      </h3>
                      <p className="text-white/50 truncate text-[9px] lg:text-[10px] cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/profile/${u.username}`);
                        }}
                      >
                        @{u.username}
                      </p>
                    </div>
                  </div>

                  <div className="flex-shrink-0 origin-right">
                    <FollowButton targetId={u._id} initialFollowing={u.isFollowing} />
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FollowFace;