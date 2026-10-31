import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase, uploadStorageObject } from "./lib/supabase.js";
import LocationInput from "./LocationInput.jsx";
import { describeWeatherCode, findNearbyMountains, getMountainForecast, resolvePlace } from "./lib/places.js";
import { AuthPage, SettingsPage } from "./Account.jsx";

const riders = {
  maya: {
    name: "Maya Chen",
    handle: "@mayamakeslines",
    role: "Snowboarder",
    bio: "Chasing soft landings & good light. Usually somewhere above the tree line. 🏔️",
    location: "Whistler, BC",
    followers: "12.8k",
    following: "684",
    clips: "38",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=85",
  },
  leo: {
    name: "Leo Martinez",
    handle: "@leomartinez",
    role: "Skier",
    bio: "Two planks, one big mountain. Here for the deep days and the après.",
    location: "Chamonix, France",
    followers: "8,420",
    following: "912",
    clips: "26",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=85",
  },
  nina: {
    name: "Nina Park",
    handle: "@ninainmotion",
    role: "Freeride skier",
    bio: "Finding the playful side of the mountain. Film photos & freeride days.",
    location: "Revelstoke, BC",
    followers: "5,680",
    following: "431",
    clips: "19",
    avatar:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=160&q=85",
  },
};

const posts = [
  {
    id: "p1",
    rider: "maya",
    time: "2h ago",
    caption: "Found the soft stuff just below the ridge. This is your sign to take the long way down.",
    location: "Whistler Blackcomb",
    likes: 2486,
    comments: 38,
    duration: "0:18",
    image:
      "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=1200&q=90",
    tag: "POWDER DAY",
  },
  {
    id: "p2",
    rider: "leo",
    time: "5h ago",
    caption: "A little bluebird lap before the clouds rolled in. Chamonix never misses.",
    location: "Aiguille du Midi, Chamonix",
    likes: 1832,
    comments: 24,
    duration: "0:24",
    image:
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=90",
    tag: "ALPINE LINES",
  },
  {
    id: "p3",
    rider: "nina",
    time: "Yesterday",
    caption: "Took a chance on the trees and got rewarded. More of this, please.",
    location: "Revelstoke Mountain Resort",
    likes: 964,
    comments: 17,
    duration: "0:15",
    image:
      "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=90",
    tag: "TREE RUN",
  },
];

const spots = [
  {
    name: "Whistler Blackcomb",
    region: "British Columbia, Canada",
    type: "Resort",
    stat: "200+ trails",
    image:
      "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=900&q=85",
    riders: "maya",
  },
  {
    name: "Aiguille du Midi",
    region: "Chamonix, France",
    type: "Backcountry",
    stat: "3,842 m",
    image:
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=900&q=85",
    riders: "leo",
  },
  {
    name: "Revelstoke",
    region: "British Columbia, Canada",
    type: "Resort",
    stat: "1,713 m vertical",
    image:
      "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=900&q=85",
    riders: "nina",
  },
  {
    name: "The Stash",
    region: "Whistler, Canada",
    type: "Terrain park",
    stat: "Natural terrain",
    image:
      "https://images.unsplash.com/photo-1517299321609-52687d1bc55a?auto=format&fit=crop&w=900&q=85",
    riders: "maya",
  },
  {
    name: "Verbier",
    region: "Valais, Switzerland",
    type: "Resort",
    stat: "410 km pistes",
    image:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=85",
    riders: "leo",
  },
  {
    name: "Mammoth Mountain",
    region: "California, USA",
    type: "Terrain park",
    stat: "9 parks & pipes",
    image:
      "https://images.unsplash.com/photo-1483664852095-d6cc6870702d?auto=format&fit=crop&w=900&q=85",
    riders: "nina",
  },
];

const suggestions = ["maya", "leo", "nina"];
const filters = ["All spots", "Resorts", "Terrain parks", "Backcountry"];

function Icon({ name, size = 20, className = "" }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    "aria-hidden": true,
  };
  const shapes = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
    explore: <><circle cx="12" cy="12" r="9" /><path d="m15.8 8.2-2.5 5.1-5.1 2.5 2.5-5.1 5.1-2.5Z" /></>,
    add: <><path d="M12 5v14M5 12h14" /></>,
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 21c.6-4 3-6 7-6s6.4 2 7 6" /></>,
    heart: <path d="M20.8 8.8c0 5.1-8.8 10-8.8 10s-8.8-4.9-8.8-10a4.7 4.7 0 0 1 8.8-2.3 4.7 4.7 0 0 1 8.8 2.3Z" />,
    comment: <><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l1.5-3.1A7.5 7.5 0 1 1 20 11.5Z" /><path d="M8.5 11.5h.01M12.5 11.5h.01M16.5 11.5h.01" /></>,
    send: <><path d="m21 3-7.2 18-3.6-7.2L3 10.2 21 3Z" /><path d="m10.2 13.8 4.2-4.2" /></>,
    bookmark: <path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4V4.5Z" />,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    pin: <><path d="M19 10.2c0 5.2-7 10.8-7 10.8S5 15.4 5 10.2a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.2" /></>,
    play: <path d="m9 6 10 6-10 6V6Z" fill="currentColor" stroke="none" />,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    mountain: <><path d="m2 20 7-13 4 7 3-5 6 11H2Z" /><path d="m7 11 2 2 2-1M14 12l2 2 2-1" /></>,
    spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" /></>,
    chevron: <path d="m7 10 5 5 5-5" />,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    upload: <><path d="M12 16V4m-5 5 5-5 5 5" /><path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" /></>,
    snow: <><path d="M12 2v20M4 6l16 12M20 6 4 18" /><path d="m9 4 3 2 3-2M9 20l3-2 3 2M3 9l3-1 1-3M17 19l1-3 3-1M21 9l-3-1-1-3M7 19l-1-3-3-1" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 0 2Z" /></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    analytics: <><path d="M4 19V5M4 19h17" /><path d="m7 15 4-4 3 2 6-7" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.5 9A7 7 0 0 1 18 6.5L20 12M4 12l2 5.5A7 7 0 0 0 18.5 15" /></>,
  };
  return <svg {...common}>{shapes[name]}</svg>;
}

function formatNumber(number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(number);
}

function formatRelativeTime(value) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)}d ago`;
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

function getRequestErrorMessage(error, setupHint) {
  const message = error?.message || "The request failed.";
  if (/jwt expired|invalid jwt|token is expired/i.test(message)) {
    return "Your Skiup sign-in has expired. Sign in again, then retry.";
  }
  return setupHint ? `${message} ${setupHint}` : message;
}

async function mapPostRecords(rows, viewerId) {
  if (!rows.length) return [];
  const ownerIds = [...new Set(rows.map((post) => post.user_id))];
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id,username,display_name,avatar_url,discipline,location")
    .in("id", ownerIds);
  if (profilesError) throw profilesError;
  const profilesById = new Map((profiles || []).map((rider) => [rider.id, rider]));
  return Promise.all(rows.map(async (post) => {
    const rider = profilesById.get(post.user_id);
    const { data: signedVideo, error: signedUrlError } = await supabase.storage
      .from("clips")
      .createSignedUrl(post.video_path, 3600);
    if (signedUrlError) throw signedUrlError;
    return {
      id: post.id,
      rider: `account-${post.user_id}`,
      ownerUserId: post.user_id,
      riderProfile: {
        name: rider?.display_name || "Mountain rider",
        handle: rider?.username ? `@${rider.username}` : "@rider",
        avatar: rider?.avatar_url || null,
        role: rider?.discipline || "Rider",
      },
      profilePath: rider?.username ? `/rider/${encodeURIComponent(rider.username)}` : `/rider/${post.user_id}`,
      time: formatRelativeTime(post.created_at),
      caption: post.caption,
      location: post.location,
      videoPath: post.video_path,
      locationLat: post.location_lat,
      locationLon: post.location_lon,
      likes: post.likes_count,
      comments: post.comments_count || 0,
      duration: "VIDEO CLIP",
      videoUrl: signedVideo.signedUrl,
      tag: "FRESH LINE",
    };
  }));
}

function FollowButton({ targetUserId, session, navigate, onFollowChanged }) {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (!session?.user?.id || !targetUserId || session.user.id === targetUserId || !supabase) {
      setStatus(null);
      return () => { active = false; };
    }
    supabase.from("follows").select("status")
      .eq("follower_id", session.user.id).eq("following_id", targetUserId).maybeSingle()
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError) setError(loadError.message);
        else setStatus(data?.status || null);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Your following status could not be loaded.");
      });
    return () => { active = false; };
  }, [session?.user?.id, targetUserId]);

  async function toggleFollow() {
    if (!session) {
      navigate("/login");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (status) {
        const { error: deleteError } = await supabase.from("follows")
          .delete().eq("follower_id", session.user.id).eq("following_id", targetUserId);
        if (deleteError) throw deleteError;
        setStatus(null);
        onFollowChanged?.(targetUserId, null);
      } else {
        const { data, error: insertError } = await supabase.from("follows")
          .insert({ follower_id: session.user.id, following_id: targetUserId })
          .select("status").single();
        if (insertError) throw insertError;
        setStatus(data.status);
        onFollowChanged?.(targetUserId, data.status);
      }
    } catch (followError) {
      setError(followError.message || "We couldn't update your following list.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="follow-control">
      <button
        className={`follow-button ${status === "accepted" ? "following" : ""}`}
        type="button"
        disabled={busy || !targetUserId || session?.user?.id === targetUserId}
        onClick={toggleFollow}
      >
        {busy ? "Saving…" : status === "accepted" ? "Following ✓" : status === "pending" ? "Requested" : "Follow rider"}
      </button>
      {error && <span className="inline-action-error" role="alert">{error}</span>}
    </span>
  );
}

function SafetyActions({ targetUserId, postId, session, onBlocked }) {
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  async function blockRider() {
    setError("");
    try {
      const { error: blockError } = await supabase.from("blocked_users").insert({
        blocker_id: session.user.id,
        blocked_id: targetUserId,
      });
      if (blockError && blockError.code !== "23505") throw blockError;
      onBlocked?.(targetUserId);
      setFeedback("Rider blocked. Their posts and contact options are hidden.");
    } catch (blockError) {
      setError(blockError.message || "We couldn't block this rider.");
    }
  }

  async function submitReport(event) {
    event.preventDefault();
    setError("");
    try {
      const { error: reportError } = await supabase.from("reports").insert({
        reporter_id: session.user.id,
        reported_user_id: targetUserId,
        post_id: postId || null,
        reason,
        details: details.trim(),
      });
      if (reportError) throw reportError;
      setReportOpen(false);
      setFeedback("Thanks for helping keep Skiup safe. Your report is private.");
    } catch (reportError) {
      setError(reportError.message || "We couldn't submit this report.");
    }
  }

  if (!session || targetUserId === session.user.id) return null;
  return (
    <div className="safety-actions">
      <button type="button" className="safety-trigger" onClick={() => setReportOpen((open) => !open)} aria-expanded={reportOpen}>Safety</button>
      {reportOpen && (
        <form className="safety-panel" onSubmit={submitReport}>
          <label>Report reason
            <select value={reason} onChange={(event) => setReason(event.target.value)}>
              <option value="spam">Spam</option>
              <option value="harassment">Harassment</option>
              <option value="unsafe">Unsafe content</option>
              <option value="copyright">Copyright concern</option>
              <option value="other">Other</option>
            </select>
          </label>
          <textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={1000} placeholder="Details (optional)" />
          <button type="submit">Send private report</button>
          <button type="button" className="safety-block" onClick={blockRider}>Block rider</button>
        </form>
      )}
      {error && <span className="inline-action-error" role="alert">{error}</span>}
      {feedback && <span className="share-feedback" role="status">{feedback}</span>}
    </div>
  );
}

function getRoute() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const profileMatch = path.match(/^\/rider\/([^/]+)$/);
  if (profileMatch) return { page: "profile", riderId: decodeURIComponent(profileMatch[1]) };
  if (path === "/login") return { page: "auth", mode: "login" };
  if (path === "/signup") return { page: "auth", mode: "signup" };
  if (path === "/forgot-password") return { page: "auth", mode: "forgot" };
  if (path === "/reset-password") return { page: "auth", mode: "reset" };
  if (path === "/explore") return { page: "explore" };
  if (path === "/upload") return { page: "upload" };
  if (path === "/settings") return { page: "settings" };
  if (path === "/profile") return { page: "profile", riderId: "self" };
  if (path === "/inbox") return { page: "inbox" };
  if (path === "/analytics") return { page: "analytics" };
  return { page: "feed" };
}

function Avatar({ riderId, riderData, size = "normal", onClick }) {
  const rider = riderData || riders[riderId];
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [rider?.avatar]);
  const image = rider?.avatar && !imageFailed
    ? <img src={rider.avatar} alt="" onError={() => setImageFailed(true)} />
    : <span className="avatar-initial">{rider?.name?.slice(0, 1).toUpperCase() || "S"}</span>;
  return onClick ? (
    <button className={`avatar avatar-${size}`} onClick={onClick} aria-label={`View ${rider?.name || "rider"}'s profile`}>{image}</button>
  ) : (
    <span className={`avatar avatar-${size}`}>{image}</span>
  );
}

function Brand() {
  return (
    <a className="brand" href="/" aria-label="Skiup home">
      <span className="brand-mark"><Icon name="mountain" size={23} /></span>
      <span>skiup<span className="brand-period">.</span></span>
    </a>
  );
}

function Navigation({ page, navigate, session, profile }) {
  const profilePath = session ? "/profile" : "/login";
  const displayName = profile?.display_name || session?.user?.email?.split("@")[0] || "Sign in";
  const username = profile?.username ? `@${profile.username}` : session ? "Complete your profile" : "Join the Skiup community";
  const avatarUrl = profile?.avatar_url;
  const items = [
    { id: "feed", label: "Your feed", icon: "home", path: "/" },
    { id: "explore", label: "Explore", icon: "explore", path: "/explore" },
    { id: "upload", label: "Create a clip", icon: "add", path: "/upload" },
    { id: "profile", label: "Your profile", icon: "user", path: profilePath },
    { id: "settings", label: "Account settings", icon: "settings", path: session ? "/settings" : "/login" },
    { id: "inbox", label: "Shared with you", icon: "send", path: session ? "/inbox" : "/login" },
    ...(session ? [{ id: "analytics", label: "Your analytics", icon: "analytics", path: "/analytics" }] : []),
  ];
  const mobileOrder = ["feed", "explore", "upload", "inbox", "profile", "settings"];
  const mobileItems = mobileOrder.map((id) => items.find((item) => item.id === id)).filter(Boolean);
  return (
    <>
      <nav className="side-nav" aria-label="Main navigation">
        <Brand />
        <p className="nav-eyebrow">YOUR MOUNTAIN</p>
        <div className="nav-links">
          {items.map((item) => (
            <a
              key={item.id}
              href={item.path}
              className={`nav-link ${page === item.id || (page === "auth" && item.id === "profile") ? "active" : ""}`}
              onClick={(event) => {
                event.preventDefault();
                navigate(item.path);
              }}
            >
              <Icon name={item.icon} size={19} />
              <span>{item.label}</span>
              {item.id === "upload" && <span className="nav-plus">+</span>}
            </a>
          ))}
        </div>
        <div className="nav-weather nav-discover">
          <div className="weather-top"><Icon name="mountain" size={16} /><span>YOUR NEXT DAY OUT</span></div>
          <strong>A new line is waiting.</strong>
          <p>Find a resort, a park, or somewhere off the map.</p>
          <button className="nav-discover-link" onClick={() => navigate("/explore")}>Explore spots <Icon name="arrow" size={14} /></button>
        </div>
        <button className="sidebar-profile" onClick={() => navigate(session ? "/profile" : "/login")}>
          <Avatar riderData={{ name: displayName, avatar: avatarUrl }} />
          <span className="sidebar-profile-copy"><strong>{displayName}</strong><small>{username}</small></span>
          <Icon name="chevron" size={16} className="sidebar-chevron" />
        </button>
      </nav>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {mobileItems.map((item) => (
          <a
            key={item.id}
            href={item.path}
            aria-label={item.label}
            className={`bottom-nav-link ${page === item.id || (page === "auth" && item.id === "profile") ? "active" : ""}`}
            onClick={(event) => {
              event.preventDefault();
              navigate(item.path);
            }}
          >
            <Icon name={item.icon} size={21} />
            <span>{item.id === "feed" ? "Feed" : item.id === "upload" ? "Upload" : item.id === "profile" ? "Profile" : item.id === "settings" ? "Settings" : item.id === "inbox" ? "Inbox" : "Explore"}</span>
          </a>
        ))}
      </nav>
    </>
  );
}

function PostCard({ post, liked, onLike, navigate, session, viewerProfile, onBlocked, onPostDeleted }) {
  const [playing, setPlaying] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [commentText, setCommentText] = useState("");
  const [commentCount, setCommentCount] = useState(post.comments || 0);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareQuery, setShareQuery] = useState("");
  const [shareRiders, setShareRiders] = useState([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const shareFeedbackTimeout = useRef(null);
  const rider = post.riderProfile || riders[post.rider];
  const profilePath = post.profilePath || `/rider/${post.rider}`;
  useEffect(() => () => window.clearTimeout(shareFeedbackTimeout.current), []);

  function showShareMessage(message) {
    setShareMessage(message);
    window.clearTimeout(shareFeedbackTimeout.current);
    shareFeedbackTimeout.current = window.setTimeout(() => setShareMessage(""), 3000);
  }

  useEffect(() => {
    if (!shareOpen || !session || !post.ownerUserId || shareQuery.trim().length < 2) {
      setShareRiders([]);
      return undefined;
    }
    let active = true;
    const timeout = window.setTimeout(async () => {
      setShareLoading(true);
      try {
        const { data, error } = await supabase.rpc("search_riders", {
          search_term: shareQuery.trim().replace(/^@/, ""),
          result_limit: 8,
        });
        if (error) throw error;
        if (active) setShareRiders(data || []);
      } catch (error) {
        if (active) showShareMessage(`Rider search failed: ${error.message}`);
      } finally {
        if (active) setShareLoading(false);
      }
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [shareOpen, shareQuery, session?.user?.id]);

  async function toggleComments() {
    if (showComments) {
      setShowComments(false);
      return;
    }
    setShowComments(true);
    if (!post.ownerUserId) {
      setCommentError("Comments are available on clips shared by Skiup riders.");
      return;
    }
    if (!supabase) {
      setCommentError("Supabase is not configured.");
      return;
    }
    setCommentsLoading(true);
    setCommentError("");
    try {
      const { data, error } = await supabase.from("comments")
        .select("id,user_id,body,created_at,profiles!comments_user_id_fkey(username,display_name,avatar_url)")
        .eq("post_id", post.id).order("created_at", { ascending: true }).limit(100);
      if (error) throw error;
      setComments(data || []);
      setCommentCount(data?.length || 0);
    } catch (error) {
      setCommentError(`Comments could not be loaded: ${error.message}`);
    } finally {
      setCommentsLoading(false);
    }
  }

  async function submitComment(event) {
    event.preventDefault();
    if (!session) {
      navigate("/login");
      return;
    }
    const body = commentText.trim();
    if (!body || !post.ownerUserId) return;
    setCommentError("");
    try {
      const { data, error } = await supabase.from("comments")
        .insert({ post_id: post.id, user_id: session.user.id, body })
        .select("id,user_id,body,created_at,profiles!comments_user_id_fkey(username,display_name,avatar_url)")
        .single();
      if (error) throw error;
      setComments((current) => [...current, data]);
      setCommentCount((count) => count + 1);
      setCommentText("");
    } catch (error) {
      setCommentError(error.message || "Your comment could not be posted.");
    }
  }

  async function deleteComment(commentId) {
    try {
      const { error } = await supabase.from("comments").delete().eq("id", commentId).eq("user_id", session.user.id);
      if (error) throw error;
      setComments((current) => current.filter((comment) => comment.id !== commentId));
      setCommentCount((count) => Math.max(0, count - 1));
    } catch (error) {
      setCommentError(error.message || "Your comment could not be deleted.");
    }
  }

  async function sendClip(recipient) {
    if (!post.ownerUserId || !session) return;
    setShareBusy(true);
    setShareMessage("");
    try {
      const { error } = await supabase.from("shared_clips").insert({
        post_id: post.id,
        sender_id: session.user.id,
        recipient_id: recipient.id,
      });
      if (error) throw error;
      showShareMessage(`Sent privately to @${recipient.username}.`);
    } catch (error) {
      showShareMessage(error.code === "23505" ? "You already sent this clip to that rider." : error.message || "This clip could not be sent.");
    } finally {
      setShareBusy(false);
    }
  }

  async function copyClipLink() {
    const url = `${window.location.origin}/#clip-${encodeURIComponent(post.id)}`;
    try {
      await navigator.clipboard.writeText(url);
      showShareMessage("Clip link copied.");
    } catch (error) {
      showShareMessage(error.message || "Could not copy the clip link.");
    }
  }

  function showSharePanel() {
    setShareOpen((open) => !open);
    setShareQuery("");
    setShareMessage("");
  }

  async function deletePost() {
    if (!session || session.user.id !== post.ownerUserId || !window.confirm("Delete this clip? This cannot be undone.")) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const { error } = await supabase.from("posts").delete()
        .eq("id", post.id).eq("user_id", session.user.id).select("id").single();
      if (error) throw error;
      let cleanupError = null;
      if (post.videoPath) {
        const { error: storageError } = await supabase.storage.from("clips").remove([post.videoPath]);
        cleanupError = storageError;
      }
      onPostDeleted?.(post, cleanupError);
    } catch (error) {
      setDeleteError(error.message || "This clip could not be deleted.");
      setDeleting(false);
    }
  }

  return (
    <article className="post-card" id={`clip-${post.id}`}>
      <div className="post-head">
        <Avatar riderId={post.rider} riderData={rider} onClick={() => navigate(profilePath)} />
        <div className="post-rider">
          <button className="name-button" onClick={() => navigate(profilePath)}>{rider.name}</button>
          <button className="post-location" onClick={() => navigate("/explore")}><Icon name="pin" size={12} />{post.location}</button>
        </div>
        <span className="post-time">{post.time}</span>
        <details className="post-menu"><summary className="icon-button more-button" aria-label="More post options">···</summary><div className="post-menu-content">{session?.user?.id === post.ownerUserId ? <button className="delete-post-button" type="button" disabled={deleting} onClick={deletePost}>{deleting ? "Deleting…" : "Delete this clip"}</button> : <SafetyActions targetUserId={post.ownerUserId} postId={post.ownerUserId ? post.id : null} session={session} onBlocked={onBlocked} />}{deleteError && <p className="inline-action-error" role="alert">{deleteError}</p>}</div></details>
      </div>
      <div
        className={`clip-frame ${playing ? "clip-playing" : ""}`}
        style={post.videoUrl ? undefined : { backgroundImage: `linear-gradient(180deg,rgba(8,14,13,.08),rgba(8,14,13,.02) 46%,rgba(8,14,13,.38)),url("${post.image}")` }}
        role={post.videoUrl ? undefined : "button"}
        tabIndex={post.videoUrl ? undefined : 0}
        onClick={() => { if (!post.videoUrl) setPlaying(!playing); }}
        onKeyDown={(event) => {
          if (!post.videoUrl && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            setPlaying(!playing);
          }
        }}
        aria-label={post.videoUrl ? undefined : playing ? "Pause video preview" : "Play video preview"}
      >
        {post.videoUrl && <video className="clip-video" src={post.videoUrl} controls playsInline preload="metadata" onClick={(event) => event.stopPropagation()} />}
        <span className="clip-tag"><span className="tag-dot" />{post.tag}</span>
        {!post.videoUrl && <span className="clip-duration">{playing ? "PREVIEWING" : post.duration}</span>}
        {!playing && !post.videoUrl && <span className="play-button"><Icon name="play" size={23} /></span>}
        {playing && <span className="preview-toast">Clip preview</span>}
        {!post.videoUrl && <span className="clip-bottom-label"><Icon name="mountain" size={15} />A day worth remembering</span>}
      </div>
      <div className="post-actions">
        <div className="action-group">
          <button className={`action-button ${liked ? "liked" : ""}`} onClick={onLike} aria-label={liked ? "Unlike clip" : "Like clip"} aria-pressed={liked}>
            <Icon name="heart" size={21} />
          </button>
          <button className="action-count" onClick={onLike}>{formatNumber(post.likes + (liked ? 1 : 0))}</button>
          <button className={`action-button comment-action ${showComments ? "selected" : ""}`} onClick={toggleComments} aria-label="View comments">
            <Icon name="comment" size={20} />
          </button>
          <button className="action-count" onClick={toggleComments}>{commentCount}</button>
          <button className={`action-button share-action ${shareOpen ? "selected" : ""}`} onClick={showSharePanel} aria-label="Send clip privately" aria-expanded={shareOpen}><Icon name="send" size={19} /></button>
        </div>
        <button className={`action-button save-action ${saved ? "saved" : ""}`} onClick={() => setSaved(!saved)} aria-label={saved ? "Remove saved clip" : "Save clip"} aria-pressed={saved}><Icon name="bookmark" size={20} /></button>
      </div>
      <p className="post-caption"><button onClick={() => navigate(profilePath)}>{rider.handle}</button> {post.caption}</p>
      {shareMessage && <p className="share-feedback" role="status">{shareMessage}</p>}
      {shareOpen && <div className="share-panel">
        <div className="share-panel-heading"><strong>Send this clip privately</strong><button type="button" onClick={() => setShareOpen(false)} aria-label="Close share panel"><Icon name="close" size={15} /></button></div>
        {session && !post.ownerUserId
          ? <p>This sample preview is not a stored rider clip, so it cannot be sent privately.</p>
          : session ? <>
          <input value={shareQuery} onChange={(event) => setShareQuery(event.target.value)} placeholder="Search rider usernames" aria-label="Search riders to send a clip" />
          {shareLoading && <p>Searching riders…</p>}
          {shareRiders.map((recipient) => <div className="share-rider" key={recipient.id}><Avatar riderId={recipient.id} riderData={{ name: recipient.display_name, avatar: recipient.avatar_url }} size="tiny" onClick={() => navigate(`/rider/${encodeURIComponent(recipient.username)}`)} /><span><strong>{recipient.display_name}</strong><small>@{recipient.username}</small></span><button type="button" disabled={shareBusy} onClick={() => sendClip(recipient)}>{shareBusy ? "Sending…" : "Send"}</button></div>)}
          {!shareLoading && shareQuery.trim().length >= 2 && shareRiders.length === 0 && <p>No riders found. Try another username.</p>}
          <button className="copy-clip-link" type="button" onClick={copyClipLink}>Copy a link</button>
        </> : <p><button className="text-link" onClick={() => navigate("/login")}>Sign in</button> to send clips to Skiup riders.</p>}
      </div>}
      {showComments && (
        <div className="comment-preview">
          {commentsLoading && <p>Loading comments…</p>}
          {comments.map((comment) => <div className="comment-row" key={comment.id}><Avatar riderId={comment.user_id} riderData={{ name: comment.profiles?.display_name || "Mountain rider", avatar: comment.profiles?.avatar_url }} size="tiny" onClick={() => comment.profiles?.username && navigate(`/rider/${encodeURIComponent(comment.profiles.username)}`)} /><p><button onClick={() => comment.profiles?.username && navigate(`/rider/${encodeURIComponent(comment.profiles.username)}`)}>@{comment.profiles?.username || "rider"}</button> {comment.body}<small>{formatRelativeTime(comment.created_at)}</small></p>{session?.user?.id === comment.user_id && <button className="comment-delete" onClick={() => deleteComment(comment.id)} aria-label="Delete your comment">×</button>}</div>)}
          {commentError && <p className="comment-error" role="alert">{commentError}</p>}
          {post.ownerUserId && <form className="comment-form" onSubmit={submitComment}><Avatar riderId={session?.user?.id} riderData={{ name: viewerProfile?.display_name || session?.user?.email || "Rider", avatar: viewerProfile?.avatar_url }} size="tiny" /><input value={commentText} onChange={(event) => setCommentText(event.target.value)} maxLength={1000} placeholder={session ? "Add a comment…" : "Sign in to comment"} disabled={!session} /><button type="submit" disabled={!session || !commentText.trim()}>Post</button></form>}
          <button className="view-comments" onClick={() => setShowComments(false)}>Close comments</button>
        </div>
      )}
    </article>
  );
}

function FeedPage({ feedPosts, feedError, likedPosts, setLikedPosts, toggleLike, navigate, activeLocation, clearLocation, session, viewerProfile, followingIds, followingMode, setFollowingMode, onBlocked, onPostDeleted }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [followingPosts, setFollowingPosts] = useState([]);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [followingError, setFollowingError] = useState("");

  useEffect(() => {
    let active = true;
    if (!followingMode || !session?.user?.id || followingIds.length === 0 || !supabase) {
      setFollowingPosts([]);
      setFollowingLoading(false);
      setFollowingError("");
      return () => { active = false; };
    }

    async function loadFollowingPosts() {
      setFollowingLoading(true);
      setFollowingError("");
      try {
        const { data: rows, error } = await supabase.from("posts")
          .select("id,user_id,caption,location,location_lat,location_lon,video_path,likes_count,comments_count,created_at")
          .in("user_id", followingIds).order("created_at", { ascending: false }).limit(60);
        if (error) throw error;
        const mappedPosts = await mapPostRecords(rows || [], session.user.id);
        const postIds = (rows || []).map((post) => post.id);
        let likedIds = [];
        if (postIds.length) {
          const { data: likes, error: likesError } = await supabase.from("post_likes")
            .select("post_id").eq("user_id", session.user.id).in("post_id", postIds);
          if (likesError) throw likesError;
          likedIds = (likes || []).map((like) => like.post_id);
        }
        if (active) {
          setFollowingPosts(mappedPosts);
          setLikedPosts((current) => ({
            ...current,
            ...Object.fromEntries(postIds.map((id) => [id, likedIds.includes(id)])),
          }));
        }
      } catch (error) {
        if (active) setFollowingError(error.message || "Clips from riders you follow could not be loaded.");
      } finally {
        if (active) setFollowingLoading(false);
      }
    }

    loadFollowingPosts();
    return () => { active = false; };
  }, [followingMode, followingIds, session?.user?.id, setLikedPosts]);

  const feedScope = followingMode
    ? followingPosts
    : feedPosts;
  const visiblePosts = activeLocation
    ? feedScope.filter((post) => post.location.toLowerCase().includes(activeLocation.toLowerCase()))
    : feedScope;
  const matchingPosts = search.trim()
    ? visiblePosts.filter((post) => {
        const rider = post.riderProfile || riders[post.rider];
        return `${rider.name} ${rider.handle} ${post.caption} ${post.location}`.toLowerCase().includes(search.trim().toLowerCase());
      })
    : visiblePosts;
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date()).toUpperCase();
  return (
    <section className="feed-column">
      <header className="page-heading feed-heading">
        <div><p className="eyebrow">{dateLabel}</p><h1>Your mountain<span className="heading-period">.</span></h1></div>
        <button className="icon-button search-button" aria-label={searchOpen ? "Close search" : "Search clips"} aria-expanded={searchOpen} onClick={() => { setSearchOpen(!searchOpen); setSearch(""); }}><Icon name={searchOpen ? "close" : "search"} size={20} /></button>
      </header>
      <div className="feed-mode-tabs" role="tablist" aria-label="Clip feed">
        <button type="button" className={!followingMode ? "active" : ""} role="tab" aria-selected={!followingMode} onClick={() => setFollowingMode(false)}>For you</button>
        <button type="button" className={followingMode ? "active" : ""} role="tab" aria-selected={followingMode} onClick={() => setFollowingMode(true)}>Following</button>
      </div>
      <div className="feed-intro"><span className="live-dot" />Your people are out there <span className="intro-separator">·</span> <span>{feedScope.length} {followingMode ? "clips from riders you follow" : "clips from the community"}</span></div>
      {searchOpen && <label className="feed-search"><Icon name="search" size={17} /><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search riders, captions, and spots" aria-label="Search the feed" /></label>}
      {feedError && <p className="feed-error" role="status">{feedError}</p>}
      {followingMode && followingLoading && <p className="mountain-loading">Loading clips from riders you follow…</p>}
      {followingMode && followingError && <p className="feed-error" role="alert">{followingError}</p>}
      {activeLocation && (
        <div className="location-filter">
          Showing clips from <strong>{activeLocation}</strong>
          <button onClick={clearLocation} aria-label="Clear location filter"><Icon name="close" size={15} /></button>
        </div>
      )}
      <div className="feed-list">
        {matchingPosts.length ? matchingPosts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            liked={Boolean(likedPosts[post.id])}
            onLike={() => toggleLike(post)}
            navigate={navigate}
            session={session}
            viewerProfile={viewerProfile}
            onBlocked={onBlocked}
            onPostDeleted={onPostDeleted}
          />
        )) : followingMode && (followingLoading || followingError) ? null : (
          <div className="empty-feed"><Icon name={search ? "search" : "mountain"} size={28} /><h3>{search ? "No clips match that search" : followingMode ? "Your following feed is quiet." : activeLocation ? "No clips from here yet" : "No clips from the community yet."}</h3><p>{search ? "Try another rider, caption, or mountain." : followingMode ? "Follow a few riders to see their latest mountain clips here." : activeLocation ? `Be the first to share a line from ${activeLocation}.` : "Discover riders and share a line from your own mountain."}</p><button className="primary-button" onClick={() => navigate(followingMode ? "/explore" : "/upload")}>{followingMode ? "Discover riders" : "Share a clip"}</button></div>
        )}
      </div>
    </section>
  );
}

function SuggestedRiders({ session, blockedIds, navigate, onFollowChanged }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (!supabase) return () => { active = false; };
    supabase.rpc("search_riders", { search_term: "", result_limit: 8 })
      .then(({ data, error: resultError }) => {
        if (!active) return;
        if (resultError) setError(resultError.message);
        else setItems((data || []).filter((item) => item.id !== session?.user?.id && !blockedIds.includes(item.id)).slice(0, 3));
      });
    return () => { active = false; };
  }, [session?.user?.id, blockedIds.join(",")]);

  return (
    <div className="rail-card riders-card">
      <div className="rail-heading"><h3>Riders to know</h3></div>
      {error && <p className="inline-action-error" role="alert">{error}</p>}
      {!error && items.map((rider) => (
        <div className="suggested-rider" key={rider.id}>
          <Avatar riderId={rider.id} riderData={{ name: rider.display_name, avatar: rider.avatar_url }} onClick={() => navigate(`/rider/${encodeURIComponent(rider.username)}`)} />
          <button className="suggested-name" onClick={() => navigate(`/rider/${encodeURIComponent(rider.username)}`)}><strong>{rider.display_name}</strong><span>@{rider.username}</span></button>
          <FollowButton targetUserId={rider.id} session={session} navigate={navigate} onFollowChanged={onFollowChanged} />
        </div>
      ))}
      {!error && items.length === 0 && <p className="mountain-loading">Discover Skiup riders in Explore.</p>}
    </div>
  );
}

function RightRail({ navigate, session, blockedIds, onFollowChanged }) {
  return (
    <aside className="right-rail">
      <div className="rail-card mountain-card">
        <div className="mountain-card-image" />
        <div className="mountain-card-copy"><span className="eyebrow">YOUR NEXT DAY OUT</span><h3>Somewhere<br />new is calling.</h3><button onClick={() => navigate("/explore")}>Find your next spot <Icon name="arrow" size={15} /></button></div>
        <span className="mountain-coordinate">50°07' N · 122°57' W</span>
      </div>
      <SuggestedRiders session={session} blockedIds={blockedIds} navigate={navigate} onFollowChanged={onFollowChanged} />
      <div className="rail-footer">Skiup is better out there.<br /><span>Made for mountain people · © 2025</span></div>
    </aside>
  );
}

function MountainUpdates({ homeLocation, homeCoordinates }) {
  const [location, setLocation] = useState(homeLocation || "");
  const [coordinates, setCoordinates] = useState(homeCoordinates || null);
  const [mountains, setMountains] = useState([]);
  const [forecasts, setForecasts] = useState({});
  const [areaForecast, setAreaForecast] = useState(null);
  const [resortSearchNotice, setResortSearchNotice] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    setLocation(homeLocation || "");
    setCoordinates(homeCoordinates || null);
  }, [homeLocation, homeCoordinates?.latitude, homeCoordinates?.longitude]);

  async function searchMountains(event) {
    event.preventDefault();
    setError("");
    setResortSearchNotice("");
    setAreaForecast(null);
    setLoading(true);
    setHasSearched(true);
    const controller = new AbortController();
    try {
      const place = coordinates || await resolvePlace(location, controller.signal);
      if (!place) throw new Error("We couldn't find that place. Try a nearby city, mountain, or resort.");
      const selectedCoordinates = { latitude: place.latitude, longitude: place.longitude };
      setCoordinates(selectedCoordinates);
      let results = [];
      try {
        results = await findNearbyMountains(place.latitude, place.longitude, controller.signal);
      } catch (resortError) {
        if (resortError.name === "AbortError") throw resortError;
        setResortSearchNotice("Nearby resort listings are temporarily unavailable. The forecast below is for your searched location, not an official resort report.");
      }
      setMountains(results);
      if (!results.length) {
        const forecast = await getMountainForecast(place.latitude, place.longitude, controller.signal);
        setAreaForecast({ label: place.label || location, forecast });
      }
      const forecastResults = await Promise.all(results.map(async (mountain) => {
        try {
          const forecast = await getMountainForecast(mountain.latitude, mountain.longitude, controller.signal);
          return [mountain.id, forecast];
        } catch (forecastError) {
          if (forecastError.name === "AbortError") throw forecastError;
          return [mountain.id, { error: forecastError.message }];
        }
      }));
      setForecasts(Object.fromEntries(forecastResults));
      setUpdatedAt(new Date().toISOString());
    } catch (searchError) {
      if (searchError.name !== "AbortError") {
        setError(searchError.message || "Mountain information could not be loaded.");
        setMountains([]);
        setForecasts({});
        setAreaForecast(null);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mountain-updates" aria-labelledby="mountain-updates-heading">
      <div className="mountain-updates-heading">
        <div><p className="eyebrow">MOUNTAIN CONDITIONS</p><h2 id="mountain-updates-heading">Find snow near you<span className="heading-period">.</span></h2><p>Nearby ski areas, with model-based weather when available.</p></div>
      </div>
      <form className="mountain-search-form" onSubmit={searchMountains}>
        <LocationInput id="mountain-search-location" className="mountain-location-input" value={location} onChange={(value) => { setLocation(value); setCoordinates(null); }} onSelect={setCoordinates} placeholder="Search any city, mountain, or resort" />
        <button className="primary-button" type="submit" disabled={loading || !location.trim()}>{loading ? "Searching…" : "Find mountains"} <Icon name="arrow" size={15} /></button>
      </form>
      <p className="mountain-data-note">Weather and snowfall are Open-Meteo model estimates, not resort snow reports. Resort opening and lift status are not provided unless a resort supplies verified data. Sources: <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a> and <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>.</p>
      {error && <p className="settings-message error" role="alert">{error}</p>}
      {resortSearchNotice && <p className="mountain-loading" role="status">{resortSearchNotice}</p>}
      {updatedAt && <p className="mountain-updated">Search refreshed {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(updatedAt))}</p>}
      {loading && <p className="mountain-loading">Looking for ski areas and forecasts…</p>}
      {!loading && hasSearched && !error && mountains.length === 0 && <p className="mountain-loading">No ski areas are listed near this place. Showing the location forecast where available.</p>}
      {areaForecast && <article className="mountain-result area-forecast-result">
        <div className="mountain-result-top"><span><Icon name="mountain" size={16} />LOCATION FORECAST</span><strong>Model data</strong></div>
        <h3>{areaForecast.label}</h3>
        {areaForecast.forecast.current && areaForecast.forecast.daily
          ? <div className="mountain-weather-grid">
              <span><strong>{areaForecast.forecast.current.temperature_2m ?? "—"}°C</strong><small>{describeWeatherCode(areaForecast.forecast.current.weather_code)}</small></span>
              <span><strong>{areaForecast.forecast.daily.snowfall_sum?.[0] ?? "—"} {areaForecast.forecast.daily_units?.snowfall_sum || "cm"}</strong><small>Forecast snowfall today</small></span>
              <span><strong>{areaForecast.forecast.current.snow_depth ?? "—"} {areaForecast.forecast.current_units?.snow_depth || "m"}</strong><small>Model snow depth</small></span>
              <span><strong>{areaForecast.forecast.current.wind_speed_10m ?? "—"} {areaForecast.forecast.current_units?.wind_speed_10m || "km/h"}</strong><small>Wind</small></span>
            </div>
          : <p className="mountain-no-data">A forecast is not available for this location.</p>}
        <div className="mountain-result-footer"><span>{areaForecast.forecast.current?.time ? `Forecast updated ${new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "short" }).format(new Date(areaForecast.forecast.current.time))}` : "No forecast available"}</span><span>Not an official resort report</span></div>
      </article>}
      {mountains.length > 0 && <div className="mountain-result-grid">{mountains.map((mountain) => {
        const forecast = forecasts[mountain.id];
        const current = forecast?.current;
        const daily = forecast?.daily;
        return (
          <article className="mountain-result" key={mountain.id}>
            <div className="mountain-result-top"><span><Icon name="mountain" size={16} />{mountain.region || `${mountain.distanceKm.toFixed(0)} km away`}</span><strong>{mountain.distanceKm.toFixed(0)} km</strong></div>
            <h3>{mountain.name}</h3>
            {forecast?.error
              ? <p className="mountain-no-data">{forecast.error}</p>
              : current && daily
                ? <div className="mountain-weather-grid">
                    <span><strong>{current.temperature_2m ?? "—"}°C</strong><small>{describeWeatherCode(current.weather_code)}</small></span>
                    <span><strong>{daily.snowfall_sum?.[0] ?? "—"} {forecast.daily_units?.snowfall_sum || "cm"}</strong><small>Forecast snowfall today</small></span>
                    <span><strong>{current.snow_depth ?? "—"} {forecast.current_units?.snow_depth || "m"}</strong><small>Model snow depth</small></span>
                    <span><strong>{current.wind_speed_10m ?? "—"} {forecast.current_units?.wind_speed_10m || "km/h"}</strong><small>Wind</small></span>
                  </div>
                : <p className="mountain-no-data">Weather forecast unavailable.</p>}
            <div className="mountain-result-footer"><span>{current?.time ? `Forecast updated ${new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "short" }).format(new Date(current.time))}` : "No forecast available"}</span><span>Opening & lift status unavailable</span></div>
            {mountain.website && <a className="mountain-source-link" href={mountain.website} target="_blank" rel="noreferrer">Resort website <Icon name="arrow" size={13} /></a>}
          </article>
        );
      })}</div>}
    </section>
  );
}

function DiscoverRiders({ session, blockedIds, navigate, onFollowChanged }) {
  const [query, setQuery] = useState("");
  const [ridersFound, setRidersFound] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) return undefined;
    let active = true;
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const { data, error: searchError } = await supabase.rpc("search_riders", {
          search_term: query.trim().replace(/^@/, ""),
          result_limit: query.trim() ? 20 : 8,
        });
        if (searchError) throw searchError;
        if (active) setRidersFound((data || []).filter((rider) => !blockedIds.includes(rider.id)).slice(0, 8));
      } catch (searchError) {
        if (active) setError(searchError.message || "Rider search is unavailable.");
      } finally {
        if (active) setLoading(false);
      }
    }, query.trim() ? 300 : 0);
    return () => { active = false; window.clearTimeout(timeout); };
  }, [query, session?.user?.id, blockedIds.join(",")]);

  return (
    <section className="discover-riders">
      <div className="discover-riders-heading"><div><p className="eyebrow">THE RIDERS</p><h2>Find your people<span className="heading-period">.</span></h2></div><span>SKIUP COMMUNITY</span></div>
      <label className="explore-search rider-search"><Icon name="search" size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search usernames" aria-label="Search rider usernames" /></label>
      {loading && <p className="mountain-loading">Finding riders…</p>}
      {error && <p className="settings-message error" role="alert">{error}</p>}
      {!loading && !error && ridersFound.length === 0 && <p className="mountain-loading">{query ? "No riders found for that username." : "No public rider profiles are available yet."}</p>}
      {ridersFound.length > 0 && <div className="discover-rider-grid">{ridersFound.map((rider) => <article className="discover-rider-card" key={rider.id}>
        <Avatar riderId={rider.id} riderData={{ name: rider.display_name, avatar: rider.avatar_url }} onClick={() => navigate(`/rider/${encodeURIComponent(rider.username)}`)} />
        <button className="discover-rider-info" onClick={() => navigate(`/rider/${encodeURIComponent(rider.username)}`)}><strong>{rider.display_name}</strong><span>@{rider.username}</span><small>{rider.discipline || "Rider"}{rider.location ? ` · ${rider.location}` : ""}</small></button>
        <FollowButton targetUserId={rider.id} session={session} navigate={navigate} onFollowChanged={onFollowChanged} />
      </article>)}</div>}
    </section>
  );
}

function ExplorePage({ navigate, chooseSpot, session, profile, preferences, blockedIds, onFollowChanged }) {
  const [filter, setFilter] = useState("All spots");
  const [search, setSearch] = useState("");
  const filteredSpots = useMemo(() => spots.filter((spot) => {
    const matchesType = filter === "All spots" || spot.type.toLowerCase() === filter.replace(/s$/, "").toLowerCase();
    const query = search.trim().toLowerCase();
    return matchesType && (!query || `${spot.name} ${spot.region} ${spot.type}`.toLowerCase().includes(query));
  }), [filter, search]);
  return (
    <section className="explore-page">
      <header className="page-heading explore-heading">
        <div><p className="eyebrow">THE MOUNTAIN IS YOURS</p><h1>Find your next line<span className="heading-period">.</span></h1><p className="page-subtitle">Good days start somewhere. Find the places and people that make them.</p></div>
      </header>
      <MountainUpdates
        homeLocation={profile?.location}
        homeCoordinates={preferences?.location_lat != null && preferences?.location_lon != null
          ? { latitude: preferences.location_lat, longitude: preferences.location_lon }
          : null}
      />
      <DiscoverRiders session={session} blockedIds={blockedIds} navigate={navigate} onFollowChanged={onFollowChanged} />
      <div className="explore-search"><Icon name="search" size={19} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search resorts, parks, and places" aria-label="Search riding spots" /><span>⌘ K</span></div>
      <div className="filter-row" role="group" aria-label="Filter spots">
        {filters.map((item) => <button key={item} className={`filter-chip ${filter === item ? "selected" : ""}`} onClick={() => setFilter(item)}>{item}</button>)}
      </div>
      <div className="explore-feature">
        <div className="feature-image" style={{ backgroundImage: `linear-gradient(90deg,rgba(11,17,15,.74),rgba(11,17,15,.05)),url("${spots[0].image}")` }}>
          <span className="feature-label"><Icon name="spark" size={14} /> RIDER FAVORITE</span>
          <div className="feature-copy"><p>THE SPOT OF THE WEEK</p><h2>Whistler<br />Blackcomb</h2><button onClick={() => chooseSpot("Whistler Blackcomb")}>See who's riding <Icon name="arrow" size={16} /></button></div>
        </div>
        <div className="feature-note"><Icon name="pin" size={16} /><span><strong>Whistler, BC</strong><small>Fresh lines. Endless options.</small></span><span className="feature-note-count">01 <i>/ 06</i></span></div>
      </div>
      <div className="explore-section-title"><div><p className="eyebrow">PICK YOUR PLAYGROUND</p><h2>Spots worth the trip</h2></div><span>{filteredSpots.length} PLACES</span></div>
      <div className="spot-grid">
        {filteredSpots.map((spot, index) => (
          <article className="spot-card" key={spot.name}>
            <button className="spot-image" style={{ backgroundImage: `linear-gradient(180deg,rgba(9,14,13,.02),rgba(9,14,13,.61)),url("${spot.image}")` }} onClick={() => chooseSpot(spot.name)} aria-label={`View clips from ${spot.name}`}>
              <span className="spot-type">{spot.type}</span><span className="spot-number">{String(index + 1).padStart(2, "0")}</span>
              <span className="spot-image-bottom"><Icon name="play" size={14} /> Browse clips</span>
            </button>
            <div className="spot-info"><div><h3>{spot.name}</h3><p><Icon name="pin" size={13} />{spot.region}</p></div><span className="spot-stat">{spot.stat}</span></div>
            <button className="spot-rider" onClick={() => navigate(`/rider/${spot.riders}`)}><Avatar riderId={spot.riders} size="tiny" />{riders[spot.riders].name.split(" ")[0]} and the Skiup crew ride here <Icon name="arrow" size={13} /></button>
          </article>
        ))}
      </div>
      {filteredSpots.length === 0 && <div className="empty-feed"><Icon name="search" size={27} /><h3>No spots found</h3><p>Try a different resort or search term.</p></div>}
      <div className="explore-callout"><span className="callout-icon"><Icon name="mountain" size={22} /></span><div><strong>Know a spot we missed?</strong><span>Great lines are better when they're shared.</span></div><button onClick={() => navigate("/upload")}>Share a clip <Icon name="arrow" size={15} /></button></div>
    </section>
  );
}

function UploadPage({ navigate, session, profile, onPostCreated }) {
  const [file, setFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [locationCoordinates, setLocationCoordinates] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraFacing, setCameraFacing] = useState("environment");
  const [cameraError, setCameraError] = useState("");
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingSecondsRef = useRef(0);
  const videoInputRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const recorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const fileInputId = "clip-file";

  useEffect(() => {
    if (!file) {
      setFilePreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setFilePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!cameraOpen) return undefined;
    let cancelled = false;
    let requestedStream = null;
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access requires a secure connection and a supported browser. You can still choose a video file.");
      return () => {};
    }

    const cameraConstraints = { video: { facingMode: { ideal: cameraFacing } } };
    navigator.mediaDevices.getUserMedia({ ...cameraConstraints, audio: true }).catch(async () => {
      const silentStream = await navigator.mediaDevices.getUserMedia({ ...cameraConstraints, audio: false });
      if (!cancelled) setCameraError("Microphone unavailable; this recording will be silent.");
      return silentStream;
    }).then((stream) => {
      requestedStream = stream;
      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      cameraStreamRef.current = stream;
      setCameraStream(stream);
    }).catch((cameraAccessError) => {
      if (!cancelled) setCameraError(`Camera unavailable: ${cameraAccessError.message || "Allow camera access"} You can still choose a saved video.`);
    });

    return () => {
      cancelled = true;
      requestedStream?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
      setCameraStream(null);
    };
  }, [cameraOpen, cameraFacing]);

  useEffect(() => {
    if (!cameraVideoRef.current || !cameraStream) return;
    cameraVideoRef.current.srcObject = cameraStream;
    cameraVideoRef.current.play().catch(() => {});
  }, [cameraStream]);

  useEffect(() => () => window.clearInterval(recordingTimerRef.current), []);

  function acceptFile(nextFile) {
    if (!nextFile) return;
    setError("");
    setSuccess("");
    const videoTypes = ["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"];
    const videoExtensions = [".mp4", ".mov", ".webm", ".m4v"];
    const extension = `.${nextFile.name.split(".").pop()?.toLowerCase() || ""}`;
    const mimeType = nextFile.type.split(";")[0];
    if (!videoExtensions.includes(extension) || (mimeType && !videoTypes.includes(mimeType))) {
      setError("Choose an MP4, MOV, M4V, or WebM video file.");
      return;
    }
    if (nextFile.size > 50 * 1024 * 1024) {
      setError("Clips must be smaller than 50 MB.");
      return;
    }
    setFile(nextFile);
    setCameraOpen(false);
  }

  function startRecording() {
    const stream = cameraStreamRef.current;
    if (!stream || !window.MediaRecorder) {
      setCameraError("Video recording is not supported in this browser. You can still choose a video file.");
      return;
    }
    try {
      const supportedTypes = ["video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
      const mimeType = supportedTypes.find((type) => window.MediaRecorder.isTypeSupported?.(type));
      const recorder = new window.MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: 2500000,
        audioBitsPerSecond: 128000,
      });
      recordingChunksRef.current = [];
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size) recordingChunksRef.current.push(event.data);
      });
      recorder.addEventListener("stop", () => {
        const type = (recorder.mimeType || "video/webm").split(";")[0];
        const extension = type.includes("mp4") ? "mp4" : "webm";
        const recordedFile = new File(recordingChunksRef.current, `skiup-clip-${Date.now()}.${extension}`, { type });
        if (!recordedFile.size) {
          setCameraError("No video was recorded. Please try again or choose a saved clip.");
          return;
        }
        acceptFile(recordedFile);
        setRecording(false);
        setCameraOpen(false);
      });
      recorderRef.current = recorder;
      recorder.start(500);
      recordingSecondsRef.current = 0;
      setRecordingSeconds(0);
      setRecording(true);
      recordingTimerRef.current = window.setInterval(() => {
        if (recordingSecondsRef.current >= 59) {
          finishRecording();
          return;
        }
        recordingSecondsRef.current += 1;
        setRecordingSeconds(recordingSecondsRef.current);
      }, 1000);
      setCameraError("");
    } catch (recordingError) {
      setCameraError(recordingError.message || "The camera could not start recording.");
    }
  }

  function finishRecording() {
    window.clearInterval(recordingTimerRef.current);
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") recorder.stop();
    else {
      setRecording(false);
      setCameraOpen(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!session) {
      navigate("/login");
      return;
    }
    if (!file || !caption.trim() || !location.trim() || !supabase) {
      setError("Choose a video, add a caption and location, then try again.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    let uploadedPath = "";
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "mp4";
      const objectPath = `${session.user.id}/${crypto.randomUUID()}.${extension}`;
      if (["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"].includes(file.type)) {
        await uploadStorageObject("clips", objectPath, file, setUploadProgress);
      } else {
        const mimeType = extension === ".mov" ? "video/quicktime" : extension === ".webm" ? "video/webm" : extension === ".m4v" ? "video/x-m4v" : "video/mp4";
        await uploadStorageObject("clips", objectPath, new File([file], file.name, { type: mimeType }), setUploadProgress);
      }
      uploadedPath = objectPath;

      const { data: signedVideo, error: signedUrlError } = await supabase.storage
        .from("clips")
        .createSignedUrl(objectPath, 3600);
      if (signedUrlError) throw signedUrlError;

      const { data: post, error: postError } = await supabase.from("posts").insert({
        user_id: session.user.id,
        caption: caption.trim(),
        location: location.trim(),
        video_path: uploadedPath,
        location_lat: locationCoordinates?.latitude ?? null,
        location_lon: locationCoordinates?.longitude ?? null,
      }).select("id,user_id,caption,location,video_path,likes_count,created_at").single();
      if (postError) throw postError;

      onPostCreated({
        id: post.id,
        rider: `account-${session.user.id}`,
        riderProfile: {
          name: profile?.display_name || session.user.email?.split("@")[0] || "Mountain rider",
          handle: profile?.username ? `@${profile.username}` : "@rider",
          avatar: profile?.avatar_url || null,
        },
        profilePath: profile?.username ? `/rider/${encodeURIComponent(profile.username)}` : "/profile",
        ownerUserId: session.user.id,
        time: "Just now",
        caption: post.caption,
        location: post.location,
        videoPath: uploadedPath,
        locationLat: locationCoordinates?.latitude ?? null,
        locationLon: locationCoordinates?.longitude ?? null,
        likes: post.likes_count,
        comments: 0,
        duration: "VIDEO CLIP",
        videoUrl: signedVideo.signedUrl,
        tag: "FRESH LINE",
      });
      setSuccess("Your clip is live on the feed.");
    } catch (publishError) {
      if (uploadedPath) {
        let cleanupMessage = "";
        try {
          const { error: cleanupError } = await supabase.storage.from("clips").remove([uploadedPath]);
          if (cleanupError) cleanupMessage = ` The uploaded video could not be removed: ${cleanupError.message}`;
        } catch (cleanupError) {
          cleanupMessage = ` The uploaded video could not be removed: ${cleanupError.message || "cleanup failed"}`;
        }
        const detail = publishError.message || "We couldn't publish your clip. Please try again.";
        const needsSchema = publishError.code === "PGRST205" || detail.includes("Could not find the table 'public.posts'");
        const message = needsSchema
          ? "Posting is not set up in Supabase yet. Run supabase/schema.sql in your project's SQL Editor, then try again."
          : detail;
        setError(`${message}${cleanupMessage}`);
      } else {
        setError(publishError.message || "We couldn't publish your clip. Please try again.");
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="upload-page">
      <header className="page-heading"><div><p className="eyebrow">YOUR MOMENT, YOUR LINE</p><h1>Share the feeling<span className="heading-period">.</span></h1><p className="page-subtitle">The best days deserve another run. Let your people be there with you.</p></div></header>
      <form className="upload-layout" onSubmit={handleSubmit}>
        <div className="upload-main">
          <div
            className={`drop-zone ${dragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => { event.preventDefault(); setDragging(false); acceptFile(event.dataTransfer.files[0]); }}
          >
            <input id={fileInputId} type="file" accept="video/mp4,video/quicktime,video/webm,video/x-m4v" onChange={(event) => acceptFile(event.target.files[0])} />
            {file ? (
              <div className="selected-file"><video className="upload-file-preview" src={filePreviewUrl} controls playsInline preload="metadata" /><div><strong>{file.name}</strong><span>{(file.size / (1024 * 1024)).toFixed(1)} MB · Ready to upload</span></div><button type="button" className="icon-button" aria-label="Remove video" onClick={() => { setFile(null); setSuccess(""); setError(""); }}><Icon name="close" size={17} /></button></div>
            ) : (
              <div className="drop-zone-label"><span className="upload-icon"><Icon name="upload" size={24} /></span><strong>Choose a clip or record one now</strong><div className="upload-source-actions"><label className="secondary-button" htmlFor={fileInputId}>Choose a video</label><button className="secondary-button" type="button" onClick={() => { setCameraError(""); setCameraOpen(true); }}>Record a clip</button></div><small>MP4, MOV or WebM · Up to 50 MB</small></div>
            )}
          </div>
          <label className="form-label" htmlFor="clip-caption">THE STORY <span>ADD A CAPTION FOR YOUR RIDERS</span></label>
          <div className="caption-field"><textarea id="clip-caption" value={caption} maxLength={280} onChange={(event) => { setCaption(event.target.value); setSuccess(""); }} placeholder="What did this moment feel like?" rows={4} /><div className="caption-meta"><span><Icon name="spark" size={14} /> Add a little context</span><span>{caption.length}/280</span></div></div>
        </div>
        <aside className="upload-details">
          <div className="upload-details-heading"><span className="step-number">01</span><div><h2>Set the scene</h2><p>A place makes it a memory.</p></div></div>
          <label className="form-label" htmlFor="clip-location">WHERE WERE YOU?</label>
          <LocationInput id="clip-location" className="account-input" value={location} onChange={(value) => { setLocation(value); setLocationCoordinates(null); setSuccess(""); }} onSelect={(place) => setLocationCoordinates(place)} placeholder="Type a mountain, resort, or place" required />
          {uploading && <div className="upload-progress" role="status" aria-live="polite"><div><span>Uploading video</span><strong>{uploadProgress}%</strong></div><progress max="100" value={uploadProgress} aria-label="Video upload progress" /></div>}
          <div className="privacy-note"><span className="privacy-check">✓</span><p><strong>Your people, your pace.</strong><br />Your clip follows your profile's privacy settings.</p></div>
          <button className="primary-button publish-button" type="submit" disabled={!file || !caption.trim() || !location.trim() || uploading}>{uploading ? `Uploading ${uploadProgress}%` : "Share your clip"} {!uploading && <Icon name="arrow" size={16} />}</button>
          {error && <p className="upload-error" role="alert">{error}</p>}
          {success && <p className="publish-success" role="status">{success} <button type="button" onClick={() => navigate("/")}>View in feed →</button></p>}
          {!session && <p className="upload-footnote">Sign in to share your clip.</p>}
          <p className="upload-footnote">MP4, MOV or WebM · Up to 50 MB · By sharing, you confirm this clip is yours to post.</p>
        </aside>
      </form>
      <div className="upload-inspiration"><span><Icon name="snow" size={18} /></span><div><strong>Little moments make the best stories.</strong><p>First chair. Last light. The run that felt like flying.</p></div><button onClick={() => navigate("/")}>Get inspired <Icon name="arrow" size={14} /></button></div>
      {cameraOpen && <div className="camera-stage" role="dialog" aria-modal="true" aria-label="Record a Skiup clip">
        <video ref={cameraVideoRef} className="camera-preview" autoPlay muted playsInline />
        <div className="camera-topbar"><span className="camera-brand">skiup<span>.</span></span><button type="button" className="camera-close" onClick={() => recording ? finishRecording() : setCameraOpen(false)} aria-label="Close camera"><Icon name="close" size={25} /></button></div>
        {recording && <span className="camera-recording-indicator"><i /> REC {String(Math.floor(recordingSeconds / 60)).padStart(2, "0")}:{String(recordingSeconds % 60).padStart(2, "0")}</span>}
        {cameraError && <p className="camera-error" role="alert">{cameraError}</p>}
        {!cameraStream && !cameraError && <p className="camera-permission">Starting camera…</p>}
        <div className="camera-controls">
          <button type="button" className="camera-gallery" onClick={() => videoInputRef.current?.click()} aria-label="Choose an existing video"><Icon name="play" size={19} /><span>Choose</span></button>
          <button type="button" className={`camera-shutter ${recording ? "is-recording" : ""}`} onClick={recording ? finishRecording : startRecording} disabled={!cameraStream && !recording} aria-label={recording ? "Stop recording" : "Start recording"}><span /></button>
          <button type="button" className="camera-flip" onClick={() => setCameraFacing((facing) => facing === "environment" ? "user" : "environment")} disabled={recording || !cameraStream} aria-label="Switch camera"><Icon name="refresh" size={22} /><span>Flip</span></button>
        </div>
      </div>}
      <input ref={videoInputRef} className="visually-hidden" type="file" accept="video/mp4,video/quicktime,video/webm,video/x-m4v" onChange={(event) => acceptFile(event.target.files[0])} />
    </section>
  );
}

function ProfilePage({ riderId, profile, userPosts, profileLoading, profileError, navigate, session, onFollowChanged, onBlocked }) {
  const isOwnProfile = riderId === "self";
  const isSampleProfile = Boolean(riders[riderId]);
  const [remoteProfile, setRemoteProfile] = useState(null);
  const [remotePosts, setRemotePosts] = useState([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState("");
  const [followerCounts, setFollowerCounts] = useState({ followers: 0, following: 0 });

  useEffect(() => {
    if (isOwnProfile || !supabase) {
      setRemoteProfile(null);
      setRemotePosts([]);
      setRemoteLoading(false);
      setRemoteError("");
      return undefined;
    }
    let active = true;
    async function loadRider() {
      setRemoteLoading(true);
      setRemoteError("");
      try {
        let query = supabase.from("profiles").select("id,username,display_name,bio,location,discipline,avatar_url,cover_url,profile_visibility");
        query = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(riderId) ? query.eq("id", riderId) : query.eq("username", riderId);
        const { data: riderProfile, error: riderError } = await query.single();
        if (riderError?.code === "PGRST116" && isSampleProfile) {
          if (active) {
            setRemoteProfile(null);
            setRemotePosts([]);
            setRemoteError("");
          }
          return;
        }
        if (riderError) throw riderError;
        const { data: rows, error: postsError } = await supabase.from("posts")
          .select("id,user_id,caption,location,location_lat,location_lon,video_path,likes_count,comments_count,created_at")
          .eq("user_id", riderProfile.id).order("created_at", { ascending: false }).limit(60);
        if (postsError) throw postsError;
        const mappedPosts = await mapPostRecords(rows || [], session?.user?.id);
        const { data: counts, error: countError } = await supabase.rpc("get_follow_counts", { target_profile_id: riderProfile.id });
        if (countError) throw countError;
        if (!active) return;
        setRemoteProfile(riderProfile);
        setRemotePosts(mappedPosts);
        setFollowerCounts(counts?.[0] || { followers: 0, following: 0 });
      } catch (loadError) {
        if (active) setRemoteError(loadError.message || "This rider profile could not be loaded.");
      } finally {
        if (active) setRemoteLoading(false);
      }
    }
    loadRider();
    return () => { active = false; };
  }, [riderId, isOwnProfile, isSampleProfile, session?.user?.id]);

  useEffect(() => {
    if (!isOwnProfile || !profile?.id || !supabase) return undefined;
    let active = true;
    supabase.rpc("get_follow_counts", { target_profile_id: profile.id }).then(({ data, error }) => {
      if (!active) return;
      if (error) setRemoteError(getRequestErrorMessage(error));
      else setFollowerCounts(data?.[0] || { followers: 0, following: 0 });
    });
    return () => { active = false; };
  }, [isOwnProfile, profile?.id]);

  const activeProfile = isOwnProfile ? profile : remoteProfile;
  const rider = activeProfile ? {
    name: activeProfile.display_name,
    handle: `@${activeProfile.username}`,
    role: activeProfile.discipline,
    bio: activeProfile.bio,
    location: activeProfile.location || "Mountain somewhere",
    followers: formatNumber(followerCounts.followers),
    following: formatNumber(followerCounts.following),
    clips: String(isOwnProfile ? userPosts.length : remotePosts.length),
    avatar: activeProfile.avatar_url || null,
    cover: activeProfile.cover_url,
  } : isSampleProfile ? riders[riderId] : null;
  const riderPosts = isOwnProfile ? userPosts : remoteProfile ? remotePosts : posts.filter((post) => post.rider === riderId);
  const targetUserId = activeProfile?.id;
  const [profileAvatarFailed, setProfileAvatarFailed] = useState(false);
  useEffect(() => setProfileAvatarFailed(false), [rider?.avatar]);

  if (remoteLoading || (isOwnProfile && profileLoading)) {
    return <div className="profile-setup">Loading rider profile…</div>;
  }
  if (!isOwnProfile && !isSampleProfile && (!activeProfile || remoteError)) {
    return <div className="profile-setup"><Icon name="mountain" size={28} /><h1>Rider profile unavailable.</h1><p>{remoteError || "This profile is private, blocked, or no longer exists."}</p><button className="primary-button" onClick={() => navigate("/")}>Back to the feed <Icon name="arrow" size={15} /></button></div>;
  }
  if (isOwnProfile && !profile) {
    return <div className="profile-setup"><Icon name="mountain" size={28} /><h1>Your rider profile is almost ready.</h1><p>{profileError || "We couldn't load your profile. Confirm your email and make sure the Supabase setup has been run."}</p><button className="primary-button" onClick={() => navigate("/settings")}>Open account settings <Icon name="arrow" size={15} /></button></div>;
  }
  if (!rider) return null;

  return (
    <section className="profile-page">
      <div className="profile-cover" style={rider.cover ? { backgroundImage: `linear-gradient(180deg,#141b1940 0%,transparent 40%,#141915a8 100%),url("${rider.cover}")` } : undefined}><span className="cover-coordinate">{rider.location.toUpperCase()}</span><span className="cover-snowflake"><Icon name="snow" size={30} /></span></div>
      <div className="profile-content">
        <div className="profile-top">
          <div className="profile-avatar">{rider.avatar && !profileAvatarFailed ? <img src={rider.avatar} alt={`${rider.name}'s profile`} onError={() => setProfileAvatarFailed(true)} /> : <span className="profile-avatar-fallback">{rider.name.slice(0, 1).toUpperCase()}</span>}</div>
          <div className="profile-buttons">
            {isOwnProfile
              ? <><button className="follow-button" onClick={() => navigate("/settings")}>Edit profile</button><button className="secondary-button" onClick={() => navigate("/analytics")}>Analytics</button></>
              : targetUserId && session?.user?.id !== targetUserId && <FollowButton targetUserId={targetUserId} session={session} navigate={navigate} onFollowChanged={onFollowChanged} />}
            {!isOwnProfile && targetUserId && <SafetyActions targetUserId={targetUserId} session={session} onBlocked={onBlocked} />}
          </div>
        </div>
        <div className="profile-name-area"><p className="eyebrow">{rider.role.toUpperCase()} <span>·</span> {rider.location.toUpperCase()}</p><h1>{rider.name}<span className="heading-period">.</span></h1><p className="profile-handle">{rider.handle}</p><p className="profile-bio">{rider.bio}</p></div>
        <div className="profile-stats"><div><strong>{rider.clips}</strong><span>clips</span></div><div><strong>{rider.followers}</strong><span>followers</span></div><div><strong>{rider.following}</strong><span>following</span></div></div>
        {remoteError && <p className="settings-message error" role="alert">{remoteError}</p>}
        <div className="profile-tabs"><button className="profile-tab active"><Icon name="play" size={15} /> CLIPS <span>{riderPosts.length}</span></button></div>
        {riderPosts.length ? <div className="profile-grid">{riderPosts.map((post) => <button className="profile-grid-item" key={post.id} onClick={() => navigate(`/#clip-${post.id}`)} style={post.videoUrl ? undefined : { backgroundImage: `linear-gradient(180deg,transparent 58%,rgba(7,12,11,.65)),url("${post.image}")` }} aria-label={`View ${rider.name}'s clip: ${post.caption}`}>{post.videoUrl && <video className="profile-grid-video" src={post.videoUrl} muted playsInline preload="metadata" />}<span className="grid-play"><Icon name="play" size={16} /></span><span className="grid-meta"><Icon name="heart" size={14} />{formatNumber(post.likes)}</span></button>)}</div> : <div className="profile-empty"><Icon name="mountain" size={25} /><h3>{isOwnProfile ? "Your next line is waiting." : "The next line is waiting."}</h3><p>{isOwnProfile ? "Share your first clip to fill this grid." : `${rider.name.split(" ")[0]}'s clips are on the way.`}</p>{isOwnProfile && <button className="primary-button" onClick={() => navigate("/upload")}>Share your first clip <Icon name="arrow" size={14} /></button>}</div>}
        <button className="profile-back" onClick={() => navigate("/")}>← Back to the feed</button>
      </div>
    </section>
  );
}

function InboxPage({ session, navigate, onFollowChanged }) {
  const [view, setView] = useState("received");
  const [shares, setShares] = useState([]);
  const [followRequests, setFollowRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadInbox() {
      setLoading(true);
      setError("");
      try {
        const [shareResult, requestResult] = await Promise.all([
          supabase.from("shared_clips").select("id,post_id,sender_id,recipient_id,created_at")
            .or(`sender_id.eq.${session.user.id},recipient_id.eq.${session.user.id}`)
            .order("created_at", { ascending: false }).limit(50),
          supabase.from("follows").select("follower_id,created_at,profiles!follows_follower_id_fkey(username,display_name,avatar_url,discipline)")
            .eq("following_id", session.user.id).eq("status", "pending").order("created_at", { ascending: false }).limit(50),
        ]);
        if (shareResult.error) throw shareResult.error;
        if (requestResult.error) throw requestResult.error;
        const shareRows = shareResult.data || [];
        const postIds = [...new Set(shareRows.map((share) => share.post_id))];
        const userIds = [...new Set(shareRows.flatMap((share) => [share.sender_id, share.recipient_id]))];
        const [postResult, profileResult] = await Promise.all([
          postIds.length ? supabase.from("posts").select("id,user_id,caption,location,location_lat,location_lon,video_path,likes_count,comments_count,created_at").in("id", postIds) : { data: [], error: null },
          userIds.length ? supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", userIds) : { data: [], error: null },
        ]);
        if (postResult.error) throw postResult.error;
        if (profileResult.error) throw profileResult.error;
        const mappedPosts = await mapPostRecords(postResult.data || [], session.user.id);
        const postsById = new Map(mappedPosts.map((post) => [post.id, post]));
        const profilesById = new Map((profileResult.data || []).map((rider) => [rider.id, rider]));
        if (active) {
          setShares(shareRows.map((share) => ({
            ...share,
            post: postsById.get(share.post_id),
            sender: profilesById.get(share.sender_id),
            recipient: profilesById.get(share.recipient_id),
          })).filter((share) => share.post));
          setFollowRequests(requestResult.data || []);
        }
      } catch (loadError) {
        if (active) setError(loadError.message || "Your inbox could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadInbox();
    return () => { active = false; };
  }, [session.user.id]);

  async function acceptRequest(followerId) {
    try {
      const { error: updateError } = await supabase.from("follows")
        .update({ status: "accepted" })
        .eq("follower_id", followerId).eq("following_id", session.user.id);
      if (updateError) throw updateError;
      setFollowRequests((current) => current.filter((request) => request.follower_id !== followerId));
      onFollowChanged?.(followerId, "accepted");
    } catch (requestError) {
      setError(requestError.message || "This follow request could not be accepted.");
    }
  }

  const visibleShares = shares.filter((share) => view === "received"
    ? share.recipient_id === session.user.id
    : share.sender_id === session.user.id);

  return (
    <section className="inbox-page">
      <header className="page-heading"><div><p className="eyebrow">YOUR PRIVATE SPACE</p><h1>Rider inbox<span className="heading-period">.</span></h1><p className="page-subtitle">Clips sent directly to you, and follow requests for your profile.</p></div></header>
      {followRequests.length > 0 && <section className="follow-requests"><div className="inbox-section-heading"><h2>Follow requests</h2><span>{followRequests.length}</span></div>{followRequests.map((request) => <div className="follow-request" key={request.follower_id}><Avatar riderId={request.follower_id} riderData={{ name: request.profiles?.display_name || "Mountain rider", avatar: request.profiles?.avatar_url }} onClick={() => request.profiles?.username && navigate(`/rider/${encodeURIComponent(request.profiles.username)}`)} /><span><strong>{request.profiles?.display_name || "Mountain rider"}</strong><small>@{request.profiles?.username || "rider"} requested to follow you</small></span><button className="primary-button" onClick={() => acceptRequest(request.follower_id)}>Accept</button></div>)}</section>}
      <div className="inbox-tabs" role="tablist" aria-label="Shared clips">
        <button role="tab" aria-selected={view === "received"} className={view === "received" ? "active" : ""} onClick={() => setView("received")}>Received</button>
        <button role="tab" aria-selected={view === "sent"} className={view === "sent" ? "active" : ""} onClick={() => setView("sent")}>Sent</button>
      </div>
      {error && <p className="settings-message error" role="alert">{error}</p>}
      {loading && <p className="mountain-loading">Loading your inbox…</p>}
      {!loading && !error && visibleShares.length === 0 && <div className="empty-feed"><Icon name="send" size={27} /><h3>No clips {view === "received" ? "sent to you" : "sent yet"}.</h3><p>Share a mountain moment privately with another rider from any clip.</p><button className="primary-button" onClick={() => navigate("/")}>Explore clips</button></div>}
      <div className="shared-clips-list">{visibleShares.map((share) => {
        const person = view === "received" ? share.sender : share.recipient;
        const displayName = person?.display_name || "Skiup rider";
        const profilePath = person?.username ? `/rider/${encodeURIComponent(person.username)}` : "/";
        return <article className="shared-clip-card" key={share.id}>
          <div className="shared-clip-sender"><Avatar riderId={person?.id} riderData={{ name: displayName, avatar: person?.avatar_url }} onClick={() => navigate(profilePath)} /><div><strong>{view === "received" ? `${displayName} sent you a clip` : `You sent a clip to ${displayName}`}</strong><small>{formatRelativeTime(share.created_at)} · Private to you and the sender</small></div></div>
          <video className="shared-clip-video" src={share.post.videoUrl} controls playsInline preload="metadata" />
          <div className="shared-clip-copy"><button onClick={() => navigate(share.post.profilePath)}>{share.post.riderProfile.name} · {share.post.location}</button><p>{share.post.caption}</p></div>
        </article>;
      })}</div>
    </section>
  );
}

function AnalyticsPage({ session, navigate }) {
  const [analytics, setAnalytics] = useState(null);
  const [topClips, setTopClips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadAnalytics() {
      setLoading(true);
      setError("");
      try {
        const [analyticsResult, clipsResult] = await Promise.all([
          supabase.rpc("get_creator_analytics", { target_user: session.user.id }),
          supabase.from("posts")
            .select("id,caption,location,likes_count,comments_count,created_at")
            .eq("user_id", session.user.id)
            .order("likes_count", { ascending: false })
            .limit(5),
        ]);
        if (analyticsResult.error) throw analyticsResult.error;
        if (clipsResult.error) throw clipsResult.error;
        if (!active) return;
        setAnalytics(analyticsResult.data);
        setTopClips(clipsResult.data || []);
      } catch (loadError) {
        if (active)         setError(getRequestErrorMessage(loadError, "Apply supabase/migrations/20261031_creator_analytics.sql after the social features migration."));
      } finally {
        if (active) setLoading(false);
      }
    }
    loadAnalytics();
    return () => { active = false; };
  }, [session.user.id]);

  const daily = analytics?.daily || [];
  const maxEngagement = Math.max(1, ...daily.map((day) => Number(day.likes || 0) + Number(day.comments || 0)));
  const cards = [
    { label: "Clips posted", value: analytics?.clips ?? 0, icon: "play" },
    { label: "Likes received", value: analytics?.likes ?? 0, icon: "heart" },
    { label: "Comments received", value: analytics?.comments ?? 0, icon: "comment" },
    { label: "Followers", value: analytics?.followers ?? 0, icon: "user" },
  ];

  return (
    <section className="analytics-page">
      <header className="page-heading"><div><p className="eyebrow">YOUR RIDING, AT A GLANCE</p><h1>Creator analytics<span className="heading-period">.</span></h1><p className="page-subtitle">A clear look at how your clips are connecting with riders.</p></div><button className="secondary-button" onClick={() => navigate("/profile")}>View profile</button></header>
      {loading && <p className="mountain-loading">Loading your analytics…</p>}
      {error && <p className="settings-message error" role="alert">{error}</p>}
      {!loading && !error && analytics && <>
        <div className="analytics-stat-grid">{cards.map((card) => <article className="analytics-stat-card" key={card.label}><span><Icon name={card.icon} size={17} />{card.label}</span><strong>{formatNumber(Number(card.value))}</strong></article>)}</div>
        <section className="analytics-panel">
          <div className="analytics-panel-heading"><div><p className="eyebrow">LAST 30 DAYS</p><h2>Clip engagement</h2></div><span>Likes + comments per day</span></div>
          {daily.some((day) => Number(day.likes || 0) + Number(day.comments || 0) > 0)
            ? <div className="analytics-chart" role="img" aria-label="Daily likes and comments during the last 30 days">{daily.map((day, index) => {
                const engagement = Number(day.likes || 0) + Number(day.comments || 0);
                const date = new Date(`${day.date}T12:00:00`);
                return <div className="analytics-bar-column" key={day.date} title={`${new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date)}: ${engagement} interactions`}><span className="analytics-bar-value">{engagement > 0 ? engagement : ""}</span><span className="analytics-bar" style={{ height: `${Math.max(3, engagement / maxEngagement * 100)}%` }} /><small>{index % 7 === 0 || index === daily.length - 1 ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date) : ""}</small></div>;
              })}</div>
            : <p className="analytics-empty">Your clip engagement will appear here after riders start liking or commenting.</p>}
        </section>
        <section className="analytics-panel top-clips-panel">
          <div className="analytics-panel-heading"><div><p className="eyebrow">YOUR CLIPS</p><h2>Top performing</h2></div></div>
          {topClips.length
            ? <div className="top-clips-list">{topClips.map((clip) => <button className="top-clip-row" key={clip.id} onClick={() => navigate(`/#clip-${clip.id}`)}><span className="top-clip-play"><Icon name="play" size={15} /></span><span className="top-clip-copy"><strong>{clip.caption}</strong><small>{clip.location} · {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(clip.created_at))}</small></span><span className="top-clip-engagement"><span><Icon name="heart" size={14} />{formatNumber(clip.likes_count)}</span><span><Icon name="comment" size={14} />{formatNumber(clip.comments_count || 0)}</span></span></button>)}</div>
            : <p className="analytics-empty">Post a clip to start building your creator analytics.</p>}
        </section>
        <p className="analytics-data-note">Analytics use likes, comments, posts, and accepted follows stored in Skiup. Video views are not currently collected, so no view counts are shown.</p>
      </>}
    </section>
  );
}

function App() {
  const [route, setRoute] = useState(getRoute);
  const [likedPosts, setLikedPosts] = useState({});
  const [activeLocation, setActiveLocation] = useState("");
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [privatePreferences, setPrivatePreferences] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [communityPosts, setCommunityPosts] = useState([]);
  const [followingIds, setFollowingIds] = useState([]);
  const [blockedIds, setBlockedIds] = useState([]);
  const [followingMode, setFollowingMode] = useState(false);
  const [feedError, setFeedError] = useState("");
  const [socialError, setSocialError] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");

  function navigate(path) {
    if (window.location.pathname !== path) window.history.pushState({}, "", path);
    setRoute(getRoute());
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return undefined;
    }
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setProfileError(error.message);
      let nextSession = data.session;
      if (nextSession) {
        supabase.auth.refreshSession().then(({ data: refreshed, error: refreshError }) => {
          if (!active) return;
          if (refreshError) {
            setProfileError(getRequestErrorMessage(refreshError));
            if (/refresh token.*(?:not found|invalid|expired)/i.test(refreshError.message || "")) {
              setSession(null);
            } else {
              setSession(nextSession);
            }
          } else {
            setSession(refreshed.session);
          }
          setAuthLoading(false);
        }).catch((refreshError) => {
          if (!active) return;
          setProfileError(getRequestErrorMessage(refreshError));
          setSession(nextSession);
          setAuthLoading(false);
        });
        return;
      }
      setSession(nextSession);
      setAuthLoading(false);
    }).catch((error) => {
      if (!active) return;
      setProfileError(error.message || "Unable to load your session.");
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
      if (!nextSession) {
        setProfile(null);
        setPrivatePreferences(null);
        setFollowingIds([]);
        setBlockedIds([]);
        setLikedPosts({});
      }
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const onPopState = () => setRoute(getRoute());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!session?.user?.id || !supabase) {
      setProfile(null);
      setPrivatePreferences(null);
      setProfileLoading(false);
      setUserPosts([]);
      setCommunityPosts([]);
      setSocialError("");
      return undefined;
    }
    let active = true;
    setProfile(null);
    setPrivatePreferences(null);
    setProfileLoading(true);
    setProfileError("");
    Promise.all([
      supabase.from("profiles").select("*").eq("id", session.user.id).single(),
      supabase.from("profile_preferences").select("id,email_notifications,location_lat,location_lon").eq("id", session.user.id).maybeSingle(),
    ])
      .then(([profileResult, preferencesResult]) => {
        if (!active) return;
        if (profileResult.error) {
          setProfile(null);
          setProfileError(getRequestErrorMessage(profileResult.error, "Run supabase/schema.sql in the Supabase SQL Editor."));
        } else {
          setProfile(profileResult.data);
          setProfileError("");
        }
        if (preferencesResult.error) {
          setPrivatePreferences(null);
          setProfileError((current) => current || `Private profile settings unavailable: ${getRequestErrorMessage(preferencesResult.error, "Run the social features migration.")}`);
        } else {
          setPrivatePreferences(preferencesResult.data);
        }
        setProfileLoading(false);
      })
      .catch((error) => {
        if (!active) return;
        setProfileError(getRequestErrorMessage(error, "Check the Supabase database setup and try again."));
        setProfileLoading(false);
      });
    return () => { active = false; };
  }, [session?.user?.id]);

  useEffect(() => {
    if (!supabase) return undefined;
    let active = true;
    async function loadPosts() {
      try {
        let { data: rows, error } = await supabase
          .from("posts")
          .select("id,user_id,caption,location,location_lat,location_lon,video_path,likes_count,comments_count,created_at")
          .order("created_at", { ascending: false })
          .limit(30);
        if (error && /location_lat|comments_count|schema cache|does not exist/i.test(error.message)) {
          setSocialError("Some clip features need the social features migration. Run supabase/migrations/20261030_social_features.sql.");
          ({ data: rows, error } = await supabase.from("posts")
            .select("id,user_id,caption,location,video_path,likes_count,created_at")
            .order("created_at", { ascending: false }).limit(30));
        }
        if (error) throw error;
        const livePosts = await mapPostRecords(rows || [], session?.user?.id);
        if (active) {
          setCommunityPosts(livePosts);
          setUserPosts(livePosts.filter((post) => post.ownerUserId === session?.user?.id));
          setFeedError("");
          if (session?.user?.id && rows.length) {
            const { data: likes, error: likesError } = await supabase.from("post_likes")
              .select("post_id").eq("user_id", session.user.id).in("post_id", rows.map((row) => row.id));
            if (likesError && active) setSocialError(getRequestErrorMessage(likesError, "Clip likes need the social features migration."));
            else if (active) setLikedPosts(Object.fromEntries((likes || []).map((like) => [like.post_id, true])));
          } else if (session?.user?.id) {
            setLikedPosts({});
          }
        }
      } catch (error) {
        if (active) {
          setCommunityPosts([]);
          setUserPosts([]);
          setFeedError(`Live clips could not be loaded: ${getRequestErrorMessage(error, "Run supabase/schema.sql and supabase/migrations/20261030_social_features.sql.")}`);
        }
      }
    }
    loadPosts();
    return () => { active = false; };
  }, [session?.user?.id, profile?.username, profile?.avatar_url, profile?.display_name]);

  useEffect(() => {
    if (!session?.user?.id || !supabase) {
      setFollowingIds([]);
      setBlockedIds([]);
      setSocialError("");
      return undefined;
    }
    let active = true;
    Promise.all([
      supabase.from("follows").select("following_id").eq("follower_id", session.user.id).eq("status", "accepted"),
      supabase.from("blocked_users").select("blocker_id,blocked_id")
        .or(`blocker_id.eq.${session.user.id},blocked_id.eq.${session.user.id}`),
    ]).then(([followsResult, blocksResult]) => {
      if (!active) return;
      if (followsResult.error || blocksResult.error) {
        setSocialError(getRequestErrorMessage(followsResult.error || blocksResult.error, "Social features need supabase/migrations/20261030_social_features.sql."));
        return;
      }
      setFollowingIds((followsResult.data || []).map((row) => row.following_id));
      setBlockedIds((blocksResult.data || []).map((row) => row.blocker_id === session.user.id ? row.blocked_id : row.blocker_id));
      setSocialError("");
    }).catch((error) => {
      if (active) setSocialError(getRequestErrorMessage(error));
    });
    return () => { active = false; };
  }, [session?.user?.id]);

  useEffect(() => {
    if (authLoading) return;
    if ((route.page === "settings" || route.page === "upload" || route.page === "inbox" || route.page === "analytics" || (route.page === "profile" && route.riderId === "self")) && !session) {
      navigate("/login");
    }
  }, [route, session, authLoading]);

  function chooseSpot(name) {
    setActiveLocation(name);
    navigate("/");
  }

  async function toggleLike(post) {
    if (!session) {
      navigate("/login");
      return;
    }
    const id = post.id;
    if (!post.ownerUserId) {
      setLikedPosts((current) => ({ ...current, [id]: !current[id] }));
      return;
    }
    const wasLiked = Boolean(likedPosts[id]);
    setLikedPosts((current) => ({ ...current, [id]: !wasLiked }));
    try {
      const request = wasLiked
        ? supabase.from("post_likes").delete().eq("post_id", id).eq("user_id", session.user.id)
        : supabase.from("post_likes").insert({ post_id: id, user_id: session.user.id });
      const { error } = await request;
      if (error) throw error;
    } catch (error) {
      setLikedPosts((current) => ({ ...current, [id]: wasLiked }));
      setFeedError(error.message || "That like could not be saved.");
    }
  }

  function addPost(post) {
    setUserPosts((current) => [post, ...current.filter((item) => item.id !== post.id)]);
    setCommunityPosts((current) => [post, ...current.filter((item) => item.id !== post.id)]);
    setFeedError("");
  }

  function removePost(post, storageCleanupError) {
    setCommunityPosts((current) => current.filter((item) => item.id !== post.id));
    setUserPosts((current) => current.filter((item) => item.id !== post.id));
    setLikedPosts((current) => {
      const next = { ...current };
      delete next[post.id];
      return next;
    });
    setFeedError(storageCleanupError
      ? `Clip deleted, but its video file could not be removed from Storage: ${storageCleanupError.message}`
      : "");
  }

  function updateFollowing(targetId, status) {
    setFollowingIds((current) => status === "accepted"
      ? [...new Set([...current, targetId])]
      : current.filter((id) => id !== targetId));
  }

  function blockRider(targetId) {
    setBlockedIds((current) => [...new Set([...current, targetId])]);
    setFollowingIds((current) => current.filter((id) => id !== targetId));
    setCommunityPosts((current) => current.filter((post) => post.ownerUserId !== targetId));
    setUserPosts((current) => current.filter((post) => post.ownerUserId !== targetId));
  }

  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate("/");
    } catch (error) {
      window.alert(error.message || "We couldn't sign you out. Please try again.");
    }
  }

  if (authLoading) return <div className="app-loading"><span className="brand-mark"><Icon name="mountain" size={23} /></span><span>Getting your gear ready...</span></div>;

  return (
    <div className="app-shell">
      {route.page !== "auth" && <Navigation page={route.page} navigate={navigate} session={session} profile={profile} />}
      <main className={`main-content ${route.page === "profile" ? "main-profile" : ""} ${route.page === "auth" ? "main-auth" : ""}`}>
        {route.page === "feed" && <div className="content-layout"><FeedPage feedPosts={[...communityPosts.filter((post) => !blockedIds.includes(post.ownerUserId)), ...posts]} feedError={[feedError, socialError].filter(Boolean).join(" ")} likedPosts={likedPosts} setLikedPosts={setLikedPosts} toggleLike={toggleLike} navigate={navigate} activeLocation={activeLocation} clearLocation={() => setActiveLocation("")} session={session} viewerProfile={profile} followingIds={followingIds} followingMode={followingMode} setFollowingMode={setFollowingMode} onBlocked={blockRider} onPostDeleted={removePost} /><RightRail navigate={navigate} session={session} blockedIds={blockedIds} onFollowChanged={updateFollowing} /></div>}
        {route.page === "explore" && <ExplorePage navigate={navigate} chooseSpot={chooseSpot} session={session} profile={profile} preferences={privatePreferences} blockedIds={blockedIds} onFollowChanged={updateFollowing} />}
        {route.page === "upload" && session && <UploadPage navigate={navigate} session={session} profile={profile} onPostCreated={addPost} />}
        {route.page === "profile" && <ProfilePage key={route.riderId} riderId={route.riderId} profile={route.riderId === "self" ? profile : null} userPosts={route.riderId === "self" ? userPosts : []} profileLoading={route.riderId === "self" && profileLoading} profileError={profileError} navigate={navigate} session={session} onFollowChanged={updateFollowing} onBlocked={blockRider} />}
        {route.page === "inbox" && session && <InboxPage session={session} navigate={navigate} onFollowChanged={updateFollowing} />}
        {route.page === "analytics" && session && <AnalyticsPage session={session} navigate={navigate} />}
        {route.page === "settings" && session && <SettingsPage session={session} profile={profile} preferences={privatePreferences} onProfileChange={setProfile} onPreferenceChange={setPrivatePreferences} onSignOut={signOut} />}
        {route.page === "settings" && profileLoading && <div className="settings-loading">Loading your settings...</div>}
        {route.page === "settings" && profileError && !profileLoading && <div className="settings-load-error" role="alert">Your account could not be loaded: {profileError}</div>}
        {route.page === "auth" && <AuthPage mode={route.mode} navigate={navigate} />}
      </main>
    </div>
  );
}

export default App;
