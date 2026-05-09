import { useEffect, useMemo, useRef, useState } from "react";
import {
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
  nip19,
  SimplePool,
} from "nostr-tools";
import type { Filter } from "nostr-tools";

type FeedPost = {
  id: string;
  content: string;
  created_at: number;
  pubkey: string;
  tags: string[][];
};

type FeedTab = "latest" | "popular";
type ComposeMode = "post" | "reply";

const DEFAULT_RELAYS = [
  "wss://relay.damus.io",
  "wss://relay.primal.net",
  "wss://nos.lol",
];
const SESSION_KEY = "axiom-anon-social-sk";
const LIKED_POSTS_KEY = "axiom-social-liked-post-ids";
const MAX_LEN = 280;
const AXIOM_TAG = "axiom-social";
const MAX_IMAGE_URL_LEN = 2048;
const HTTPS_IMAGE_EXT = /\.(png|jpe?g|gif|webp)$/i;

function readLikedPostIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(LIKED_POSTS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed.filter(
        (id): id is string =>
          typeof id === "string" && id.length > 0 && id.length <= 80,
      ),
    );
  } catch {
    return new Set();
  }
}

function persistLikedPostIds(ids: Set<string>) {
  sessionStorage.setItem(LIKED_POSTS_KEY, JSON.stringify([...ids]));
}

/** Only https URLs with an image extension in the path; no svg (scriptable). */
function isSafeHttpsImageUrl(raw: string): string | null {
  const trimmed = raw.trim().replace(/^[<(]+|[>)]+$/g, "").trim();
  if (!trimmed || trimmed.length > MAX_IMAGE_URL_LEN) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "https:") return null;
    if (u.username || u.password) return null;
    if (!HTTPS_IMAGE_EXT.test(u.pathname)) return null;
    return u.href;
  } catch {
    return null;
  }
}

function findFirstSafeImageUrlInText(text: string): string | null {
  const re = /https:\/\/[^\s<>"')]+/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const candidate = m[0].replace(/[.,;:!?)]+$/g, "");
    const ok = isSafeHttpsImageUrl(candidate);
    if (ok) return ok;
  }
  return null;
}

function parsePostDisplay(content: string): { text: string; imageUrl: string | null } {
  const trimmed = content.trim();
  const onlyUrl = isSafeHttpsImageUrl(trimmed);
  if (onlyUrl) return { text: "", imageUrl: onlyUrl };
  const embedded = findFirstSafeImageUrlInText(content);
  return { text: content, imageUrl: embedded };
}

function PostImagePreview({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 block text-[10px] text-fuchsia-300/90 underline"
      >
        Image (open link)
      </a>
    );
  }
  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      className="mt-2 max-h-64 max-w-full rounded-md border border-white/[0.08] object-contain"
      onError={() => setFailed(true)}
    />
  );
}

function readOrCreateSecretKey(): Uint8Array {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) {
      const parsed = JSON.parse(existing);
      if (Array.isArray(parsed)) return Uint8Array.from(parsed);
    }
  } catch {
    // fallback to new key if session parsing fails
  }
  const sk = generateSecretKey();
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(Array.from(sk)));
  return sk;
}

function makeAnonLabel(pubkey: string): string {
  return `anon-${pubkey.slice(0, 6)}`;
}

function uniquePosts(posts: FeedPost[]): FeedPost[] {
  const seen = new Set<string>();
  const out: FeedPost[] = [];
  for (const post of posts) {
    if (!seen.has(post.id)) {
      seen.add(post.id);
      out.push(post);
    }
  }
  return out.sort((a, b) => b.created_at - a.created_at);
}

function extractHashTags(content: string): string[] {
  const tags = content.match(/#[a-z0-9_]{2,24}/gi) ?? [];
  return Array.from(new Set(tags.map((tag) => tag.slice(1).toLowerCase())));
}

function hasReplyTag(tags: string[][]): boolean {
  return tags.some((t) => t[0] === "e" && (t[3] === "reply" || t[3] === "root"));
}

function postLikes(postId: string, reactions: Record<string, number>): number {
  return reactions[postId] ?? 0;
}

function postReposts(postId: string, reposts: Record<string, number>): number {
  return reposts[postId] ?? 0;
}

function scorePost(
  post: FeedPost,
  reactionMap: Record<string, number>,
  repostMap: Record<string, number>,
): number {
  const ageMinutes = Math.max(1, (Date.now() / 1000 - post.created_at) / 60);
  const likes = postLikes(post.id, reactionMap);
  const reposts = postReposts(post.id, repostMap);
  return (likes * 2 + reposts * 3 + 1) / Math.sqrt(ageMinutes);
}

export default function Social() {
  const [tab, setTab] = useState<FeedTab>("latest");
  const [relayInput, setRelayInput] = useState(DEFAULT_RELAYS.join(", "));
  const [draft, setDraft] = useState("");
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const [reposts, setReposts] = useState<Record<string, number>>({});
  const [isPublishing, setIsPublishing] = useState(false);
  const [status, setStatus] = useState("Disconnected");
  const [error, setError] = useState<string | null>(null);
  const [composerMode, setComposerMode] = useState<ComposeMode>("post");
  const [replyTo, setReplyTo] = useState<FeedPost | null>(null);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(
    () => readLikedPostIds(),
  );
  const [pendingLikeIds, setPendingLikeIds] = useState<Set<string>>(
    () => new Set(),
  );

  const listRef = useRef<HTMLDivElement | null>(null);
  const poolRef = useRef<SimplePool | null>(null);
  const subCloseRef = useRef<Array<{ close: (reason?: string) => void }>>([]);
  const skRef = useRef<Uint8Array>(readOrCreateSecretKey());
  const pkRef = useRef<string>(getPublicKey(skRef.current));
  const myNpub = useMemo(() => nip19.npubEncode(pkRef.current), []);

  const relays = useMemo(
    () =>
      relayInput
        .split(",")
        .map((relay) => relay.trim())
        .filter(Boolean)
        .filter((relay) => relay.startsWith("wss://")),
    [relayInput],
  );

  useEffect(() => {
    listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [tab]);

  useEffect(() => {
    setPosts([]);
    setReactions({});
    setReposts({});
    setError(null);

    if (!relays.length) {
      setStatus("No valid relays. Use comma-separated wss:// URLs.");
      return;
    }

    const pool = new SimplePool();
    poolRef.current = pool;
    setStatus("Connecting...");
    subCloseRef.current = [];

    const seenReactionEventIds = new Set<string>();
    const seenRepostEventIds = new Set<string>();

    const postFilter: Filter = {
      kinds: [1],
      "#t": [AXIOM_TAG],
      limit: 180,
    };
    const reactionFilter: Filter = {
      kinds: [7],
      "#t": [AXIOM_TAG],
      limit: 300,
    };
    const repostFilter: Filter = {
      kinds: [6],
      "#t": [AXIOM_TAG],
      limit: 240,
    };

    const postsSub = pool.subscribeMany(relays, postFilter, {
      onevent(event) {
        if (!event?.id || !event?.pubkey || typeof event.content !== "string") return;
        setPosts((prev) =>
          uniquePosts([
            ...prev,
            {
              id: event.id,
              content: event.content,
              created_at: event.created_at ?? Math.floor(Date.now() / 1000),
              pubkey: event.pubkey,
              tags: event.tags ?? [],
            },
          ]),
        );
      },
      oneose() {
        setStatus("Live feed connected");
      },
      onclose(reason) {
        if (reason) setStatus("Disconnected");
      },
    });

    const reactionsSub = pool.subscribeMany(relays, reactionFilter, {
      onevent(event) {
        if (!event?.id || seenReactionEventIds.has(event.id)) return;
        const targetId = event.tags?.find((t) => t[0] === "e")?.[1];
        if (!targetId || event.content !== "+") return;
        seenReactionEventIds.add(event.id);
        setReactions((prev) => ({ ...prev, [targetId]: (prev[targetId] ?? 0) + 1 }));
      },
    });

    const repostSub = pool.subscribeMany(relays, repostFilter, {
      onevent(event) {
        if (!event?.id || seenRepostEventIds.has(event.id)) return;
        const targetId = event.tags?.find((t) => t[0] === "e")?.[1];
        if (!targetId) return;
        seenRepostEventIds.add(event.id);
        setReposts((prev) => ({ ...prev, [targetId]: (prev[targetId] ?? 0) + 1 }));
      },
    });

    subCloseRef.current.push(postsSub, reactionsSub, repostSub);

    return () => {
      try {
        subCloseRef.current.forEach((sub) => sub.close());
      } catch {
        // best effort
      }
      subCloseRef.current = [];
      pool.close(relays);
      poolRef.current = null;
      setStatus("Disconnected");
    };
  }, [relays]);

  const trendingTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const post of posts) {
      const tags = extractHashTags(post.content);
      for (const tag of tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [posts]);

  const feed = useMemo(() => {
    const onlyTopLevel = posts.filter((post) => !hasReplyTag(post.tags));
    if (tab === "latest") return onlyTopLevel;
    return [...onlyTopLevel].sort(
      (a, b) => scorePost(b, reactions, reposts) - scorePost(a, reactions, reposts),
    );
  }, [posts, reactions, reposts, tab]);

  const publishEvent = async (
    kind: number,
    content: string,
    tags: string[][],
  ): Promise<void> => {
    if (!poolRef.current || !relays.length) {
      setError("No active relay connection.");
      return;
    }
    const event = finalizeEvent(
      {
        kind,
        created_at: Math.floor(Date.now() / 1000),
        tags: [...tags, ["t", AXIOM_TAG], ["client", "axiom-os-anonymous-social"]],
        content,
      },
      skRef.current,
    );
    poolRef.current.publish(relays, event);
  };

  const publishPost = async () => {
    const content = draft.trim().slice(0, MAX_LEN);
    if (!content) return;
    setError(null);
    setIsPublishing(true);
    try {
      if (composerMode === "reply" && replyTo) {
        await publishEvent(1, content, [
          ["e", replyTo.id, "", "reply"],
          ["p", replyTo.pubkey],
        ]);
      } else {
        const hashTags = extractHashTags(content);
        await publishEvent(
          1,
          content,
          hashTags.map((tag) => ["t", tag]),
        );
      }
      setDraft("");
      setComposerMode("post");
      setReplyTo(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish post.");
    } finally {
      setIsPublishing(false);
    }
  };

  const reactToPost = async (post: FeedPost) => {
    if (likedPostIds.has(post.id) || pendingLikeIds.has(post.id)) return;
    setPendingLikeIds((prev) => new Set(prev).add(post.id));
    setError(null);
    try {
      await publishEvent(7, "+", [
        ["e", post.id],
        ["p", post.pubkey],
      ]);
      setLikedPostIds((prev) => {
        const next = new Set(prev);
        next.add(post.id);
        persistLikedPostIds(next);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to react.");
    } finally {
      setPendingLikeIds((prev) => {
        const next = new Set(prev);
        next.delete(post.id);
        return next;
      });
    }
  };

  const repostPost = async (post: FeedPost) => {
    try {
      await publishEvent(6, "", [
        ["e", post.id],
        ["p", post.pubkey],
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to repost.");
    }
  };

  const startReply = (post: FeedPost) => {
    setComposerMode("reply");
    setReplyTo(post);
  };

  const cancelReply = () => {
    setComposerMode("post");
    setReplyTo(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col text-slate-300">
      <div className="flex-shrink-0 border-b border-white/[0.05] px-2 py-2 sm:px-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[9px] uppercase tracking-widest text-slate-500">
            Anonymous Social
          </span>
          <span className="rounded bg-fuchsia-500/10 px-2 py-0.5 text-[9px] text-fuchsia-200">
            {status}
          </span>
          <span className="ml-auto text-[9px] text-slate-500">
            you: {makeAnonLabel(pkRef.current)}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setTab("latest")}
            className={`rounded px-2.5 py-1 text-[10px] ${
              tab === "latest"
                ? "bg-fuchsia-500/20 text-fuchsia-100"
                : "bg-white/[0.04] text-slate-400"
            }`}
          >
            Latest
          </button>
          <button
            onClick={() => setTab("popular")}
            className={`rounded px-2.5 py-1 text-[10px] ${
              tab === "popular"
                ? "bg-fuchsia-500/20 text-fuchsia-100"
                : "bg-white/[0.04] text-slate-400"
            }`}
          >
            Popular
          </button>
          <input
            value={relayInput}
            onChange={(e) => setRelayInput(e.target.value)}
            className="min-w-0 w-full max-w-full rounded border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[10px] outline-none focus:border-fuchsia-500/60 md:ml-auto md:max-w-[360px]"
            placeholder="Relays (comma-separated wss://...)"
          />
        </div>
      </div>

      <div className="flex-shrink-0 border-b border-white/[0.05] px-2 py-2 sm:px-3">
        {composerMode === "reply" && replyTo && (
          <div className="mb-2 rounded border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-1 text-[10px] text-fuchsia-100">
            Replying to {makeAnonLabel(replyTo.pubkey)}
            <button onClick={cancelReply} className="ml-2 text-fuchsia-200/80 hover:text-white">
              cancel
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void publishPost();
              }
            }}
            maxLength={MAX_LEN}
            className="flex-1 rounded border border-white/[0.08] bg-white/[0.03] px-2 py-1.5 text-[12px] outline-none focus:border-fuchsia-500/60"
            placeholder={
              composerMode === "reply"
                ? "Write anonymous reply..."
                : "What's happening (anonymously)?"
            }
          />
          <button
            onClick={() => void publishPost()}
            disabled={isPublishing || !draft.trim()}
            className="rounded bg-fuchsia-500/80 px-3 py-1.5 text-[11px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Post
          </button>
        </div>
        <div className="mt-1 flex items-center justify-between text-[9px] text-slate-500">
          <span>{MAX_LEN - draft.length} chars left</span>
          <span>public feed tag: #{AXIOM_TAG}</span>
        </div>
        {error && <div className="mt-1 text-[10px] text-red-300">{error}</div>}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(140px,170px)]">
        <div
          ref={listRef}
          className="min-h-0 space-y-2 overflow-y-auto px-2 py-3 sm:px-3 md:order-1"
        >
          {feed.map((post) => {
            const { text, imageUrl } = parsePostDisplay(post.content);
            const liked = likedPostIds.has(post.id);
            const likeBusy = pendingLikeIds.has(post.id);
            return (
            <div key={post.id} className="rounded border border-white/[0.06] bg-white/[0.03] p-2">
              <div className="mb-1 flex items-center gap-2 text-[10px] text-slate-500">
                <span>{makeAnonLabel(post.pubkey)}</span>
                <span>·</span>
                <span>{new Date(post.created_at * 1000).toLocaleString()}</span>
              </div>
              {text ? (
                <div className="break-words text-[12px] text-slate-200">{text}</div>
              ) : null}
              {imageUrl ? <PostImagePreview url={imageUrl} /> : null}
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400">
                <button
                  type="button"
                  onClick={() => void reactToPost(post)}
                  disabled={liked || likeBusy}
                  title={
                    liked
                      ? "You already liked this post this session"
                      : "Like (once per session)"
                  }
                  className={`disabled:cursor-not-allowed disabled:opacity-50 ${
                    liked ? "text-fuchsia-300" : "hover:text-fuchsia-200"
                  }`}
                >
                  {liked ? "Liked · " : "Like · "}
                  {postLikes(post.id, reactions)}
                  {likeBusy ? " …" : ""}
                </button>
                <button onClick={() => void repostPost(post)} className="hover:text-fuchsia-200">
                  Repost · {postReposts(post.id, reposts)}
                </button>
                <button onClick={() => startReply(post)} className="hover:text-fuchsia-200">
                  Reply
                </button>
              </div>
            </div>
            );
          })}
          {!feed.length && (
            <div className="text-[11px] text-slate-600">
              No posts yet. Be the first anonymous voice in the feed.
            </div>
          )}
        </div>
        <aside className="max-h-[40vh] shrink-0 overflow-y-auto border-t border-white/[0.05] px-2 py-3 sm:px-3 md:max-h-none md:border-l md:border-t-0 md:border-white/[0.05] md:order-2">
          <div className="mb-2 text-[9px] uppercase tracking-widest text-slate-500">Trends</div>
          <div className="space-y-1.5">
            {trendingTags.map(([tag, count]) => (
              <div key={tag} className="rounded bg-white/[0.03] px-2 py-1 text-[10px] text-slate-300">
                #{tag} <span className="text-slate-500">· {count}</span>
              </div>
            ))}
            {!trendingTags.length && (
              <div className="text-[10px] text-slate-600">No trends yet.</div>
            )}
          </div>
          <div className="mt-4 text-[9px] text-slate-600">
            Your ephemeral ID:
            <div className="mt-1 break-all text-slate-500">{myNpub}</div>
          </div>
          <div className="mt-3 text-[9px] text-slate-600">
            This is anonymous by session. Close tab to rotate identity.
          </div>
        </aside>
      </div>
    </div>
  );
}
