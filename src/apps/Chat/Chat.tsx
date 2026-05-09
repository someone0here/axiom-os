import { useEffect, useMemo, useRef, useState } from "react";
import {
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
  nip04,
  nip19,
  SimplePool,
} from "nostr-tools";
import type { Filter } from "nostr-tools";

type ChatMessage = {
  id: string;
  content: string;
  created_at: number;
  pubkey: string;
};

type ChatMode = "world" | "dm";
type DMContact = {
  id: string;
  name: string;
  pubkey: string;
};

const DEFAULT_RELAYS = [
  "wss://relay.damus.io",
  "wss://relay.primal.net",
  "wss://nos.lol",
];

const MAX_LEN = 400;
const SESSION_KEY = "axiom-anon-chat-sk";
const CONTACTS_KEY = "axiom-anon-chat-contacts";

function toRoomTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 32) || "lobby";
}

function makeAnonLabel(pubkey: string): string {
  return `anon-${pubkey.slice(0, 6)}`;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function parseNostrPubkey(value: string): string | null {
  const input = value.trim();
  if (!input) return null;
  if (/^[a-f0-9]{64}$/i.test(input)) return input.toLowerCase();
  if (!input.startsWith("npub")) return null;
  try {
    const decoded = nip19.decode(input);
    if (decoded.type === "npub") {
      const hex = String(decoded.data).toLowerCase();
      return /^[a-f0-9]{64}$/.test(hex) ? hex : null;
    }
    return null;
  } catch {
    return null;
  }
}

function isValidPubkey(pubkey: string | null): pubkey is string {
  return typeof pubkey === "string" && /^[a-f0-9]{64}$/i.test(pubkey);
}

function readOrCreateSecretKey(): Uint8Array {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) {
      const arr = JSON.parse(existing);
      if (Array.isArray(arr)) {
        return Uint8Array.from(arr);
      }
    }
  } catch {
    // if session storage parsing fails, create a fresh key
  }

  const sk = generateSecretKey();
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(Array.from(sk)));
  return sk;
}

function uniqueById(messages: ChatMessage[]): ChatMessage[] {
  const seen = new Set<string>();
  const out: ChatMessage[] = [];
  for (const m of messages) {
    if (!seen.has(m.id)) {
      seen.add(m.id);
      out.push(m);
    }
  }
  return out.sort((a, b) => a.created_at - b.created_at);
}

function readContacts(): DMContact[] {
  try {
    const raw = localStorage.getItem(CONTACTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is DMContact =>
          item &&
          typeof item.id === "string" &&
          typeof item.name === "string" &&
          typeof item.pubkey === "string" &&
          /^[a-f0-9]{64}$/i.test(item.pubkey),
      )
      .map((c) => ({ ...c, pubkey: c.pubkey.toLowerCase() }));
  } catch {
    return [];
  }
}

function writeContacts(contacts: DMContact[]) {
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
}

export default function Chat() {
  const [mode, setMode] = useState<ChatMode>("world");
  const [roomInput, setRoomInput] = useState("lobby");
  const [room, setRoom] = useState("lobby");
  const [peerInput, setPeerInput] = useState("");
  const [peerPubkey, setPeerPubkey] = useState<string | null>(null);
  const [contacts, setContacts] = useState<DMContact[]>([]);
  const [contactNameInput, setContactNameInput] = useState("");
  const [contactKeyInput, setContactKeyInput] = useState("");
  const [relayInput, setRelayInput] = useState(DEFAULT_RELAYS.join(", "));
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState("Disconnected");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const relays = useMemo(
    () =>
      relayInput
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean)
        .filter((r) => r.startsWith("wss://")),
    [relayInput],
  );

  const skRef = useRef<Uint8Array>(readOrCreateSecretKey());
  const pkRef = useRef<string>(getPublicKey(skRef.current));
  const skHexRef = useRef<string>(bytesToHex(skRef.current));
  const myNpub = useMemo(() => nip19.npubEncode(pkRef.current), []);
  const poolRef = useRef<SimplePool | null>(null);
  const subCloseRef = useRef<Array<{ close: (reason?: string) => void }>>([]);

  useEffect(() => {
    setContacts(readContacts());
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  useEffect(() => {
    setMessages([]);
    setError(null);

    if (!relays.length) {
      setStatus("No valid relays. Use wss:// URLs.");
      return;
    }

    if (mode === "dm" && !isValidPubkey(peerPubkey)) {
      setStatus("Set peer npub/hex pubkey to start DM.");
      return;
    }

    const pool = new SimplePool();
    poolRef.current = pool;
    setStatus("Connecting...");
    subCloseRef.current = [];

    if (mode === "world") {
      const tag = toRoomTag(room);
      const filter: Filter = {
        kinds: [1],
        "#t": [`axiom-${tag}`],
        limit: 120,
      };

      const close = pool.subscribeMany(relays, filter, {
        onevent(event) {
          if (
            !event?.id ||
            !event?.pubkey ||
            typeof event.content !== "string"
          ) {
            return;
          }
          setMessages((prev) =>
            uniqueById([
              ...prev,
              {
                id: event.id,
                content: event.content,
                created_at: event.created_at ?? Math.floor(Date.now() / 1000),
                pubkey: event.pubkey,
              },
            ]),
          );
        },
        oneose() {
          setStatus(`Live in #${tag}`);
        },
        onclose(reason) {
          if (reason) setStatus("Disconnected");
        },
      });

      subCloseRef.current.push(close);
    } else if (isValidPubkey(peerPubkey)) {
      const incomingFilter: Filter = {
        kinds: [4],
        authors: [peerPubkey],
        "#p": [pkRef.current],
        limit: 120,
      };
      const outgoingFilter: Filter = {
        kinds: [4],
        authors: [pkRef.current],
        "#p": [peerPubkey],
        limit: 120,
      };

      const handleDMEvent = async (event: {
        id: string;
        pubkey: string;
        content: string;
        created_at?: number;
      }) => {
        if (!event?.id || !event?.pubkey || typeof event.content !== "string") {
          return;
        }
        try {
          const otherPubkey =
            event.pubkey === pkRef.current ? peerPubkey : event.pubkey;
          const plaintext = await nip04.decrypt(
            skHexRef.current,
            otherPubkey,
            event.content,
          );
          setMessages((prev) =>
            uniqueById([
              ...prev,
              {
                id: event.id,
                content: plaintext,
                created_at: event.created_at ?? Math.floor(Date.now() / 1000),
                pubkey: event.pubkey,
              },
            ]),
          );
        } catch {
          // ignore undecryptable events
        }
      };

      const inClose = pool.subscribeMany(relays, incomingFilter, {
        onevent(event) {
          void handleDMEvent(event);
        },
        oneose() {
          setStatus(`Secure DM with ${makeAnonLabel(peerPubkey)}`);
        },
        onclose(reason) {
          if (reason) setStatus("Disconnected");
        },
      });

      const outClose = pool.subscribeMany(relays, outgoingFilter, {
        onevent(event) {
          void handleDMEvent(event);
        },
      });

      subCloseRef.current.push(inClose, outClose);
    }

    return () => {
      try {
        subCloseRef.current.forEach((s) => s.close());
      } catch {
        // best effort cleanup
      }
      subCloseRef.current = [];
      pool.close(relays);
      poolRef.current = null;
      setStatus("Disconnected");
    };
  }, [mode, room, peerPubkey, relays]);

  const send = async () => {
    const content = draft.trim();
    if (!content) return;
    if (!poolRef.current || !relays.length) {
      setError("No active relay connection.");
      return;
    }
    setError(null);
    setIsSending(true);

    try {
      const now = Math.floor(Date.now() / 1000);
      const isDM = mode === "dm";
      const payload = content.slice(0, MAX_LEN);
      let outgoingContent = payload;
      let eventTags: string[][] = [
        ["client", "axiom-os-anonymous-world-chat"],
      ];
      let kind = 1;

      if (isDM) {
        if (!isValidPubkey(peerPubkey)) {
          throw new Error("Peer public key is required for DM mode.");
        }
        outgoingContent = await nip04.encrypt(skHexRef.current, peerPubkey, payload);
        eventTags = [
          ["p", peerPubkey],
          ["client", "axiom-os-anonymous-dm"],
        ];
        kind = 4;
      } else {
        eventTags = [
          ["t", `axiom-${toRoomTag(room)}`],
          ["client", "axiom-os-anonymous-world-chat"],
        ];
      }

      const event = finalizeEvent(
        {
          kind,
          created_at: now,
          tags: eventTags,
          content: outgoingContent,
        },
        skRef.current,
      );

      setMessages((prev) =>
        uniqueById([
          ...prev,
          {
            id: event.id,
            content: payload,
            created_at: event.created_at,
            pubkey: event.pubkey,
          },
        ]),
      );

      poolRef.current.publish(relays, event);
      setDraft("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to publish.";
      if (message.includes("fill") || message.includes("point")) {
        setError(
          "Peer key is invalid for Nostr DM encryption. Use full npub or 64-char hex pubkey.",
        );
      } else {
        setError(message);
      }
    } finally {
      setIsSending(false);
    }
  };

  const addContact = () => {
    const parsed = parseNostrPubkey(contactKeyInput);
    const name = contactNameInput.trim();
    if (!name) {
      setError("Contact name is required.");
      return;
    }
    if (!parsed) {
      setError("Invalid contact key. Use npub... or 64-char hex pubkey.");
      return;
    }

    const next: DMContact = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      name: name.slice(0, 32),
      pubkey: parsed,
    };
    const updated = [next, ...contacts.filter((c) => c.pubkey !== parsed)];
    setContacts(updated);
    writeContacts(updated);
    setPeerPubkey(parsed);
    setPeerInput(parsed);
    setContactNameInput("");
    setContactKeyInput("");
    setError(null);
  };

  const useContact = (contact: DMContact) => {
    if (!isValidPubkey(contact.pubkey)) {
      setError("Saved contact key is invalid. Please remove and add again.");
      return;
    }
    setPeerPubkey(contact.pubkey);
    setPeerInput(contact.pubkey);
    setError(null);
  };

  const removeContact = (id: string) => {
    const removed = contacts.find((c) => c.id === id);
    const updated = contacts.filter((c) => c.id !== id);
    setContacts(updated);
    writeContacts(updated);
    if (removed && peerPubkey === removed.pubkey) {
      setPeerPubkey(null);
      setPeerInput("");
      setMessages([]);
    }
  };

  const activeContact = contacts.find((c) => c.pubkey === peerPubkey) || null;

  return (
    <div className="flex h-full min-h-0 flex-col text-slate-300">
      <div className="flex-shrink-0 border-b border-white/[0.05] px-2 py-2 sm:px-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[9px] uppercase tracking-widest text-slate-500">
            Anonymous Nostr Chat
          </span>
          <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-[9px] text-cyan-300">
            {status}
          </span>
          <span className="ml-auto text-[9px] text-slate-600">
            you: {makeAnonLabel(pkRef.current)}
          </span>
        </div>
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => setMode("world")}
            className={`rounded px-2.5 py-1 text-[10px] ${
              mode === "world"
                ? "bg-cyan-500/20 text-cyan-200"
                : "bg-white/[0.04] text-slate-400"
            }`}
          >
            World Chat
          </button>
          <button
            onClick={() => setMode("dm")}
            className={`rounded px-2.5 py-1 text-[10px] ${
              mode === "dm"
                ? "bg-cyan-500/20 text-cyan-200"
                : "bg-white/[0.04] text-slate-400"
            }`}
          >
            1:1 Anonymous DM
          </button>
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
          {mode === "world" ? (
            <input
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              onBlur={() => setRoom(toRoomTag(roomInput))}
              onKeyDown={(e) => {
                if (e.key === "Enter") setRoom(toRoomTag(roomInput));
              }}
              className="rounded border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11px] outline-none focus:border-cyan-500/60"
              placeholder="Room (e.g. lobby)"
            />
          ) : (
            <input
              value={peerInput}
              onChange={(e) => setPeerInput(e.target.value)}
              onBlur={() => {
                const parsed = parseNostrPubkey(peerInput);
                setPeerPubkey(parsed);
                if (!parsed && peerInput.trim()) {
                  setError("Invalid peer key. Use npub... or 64-char hex pubkey.");
                } else {
                  setError(null);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const parsed = parseNostrPubkey(peerInput);
                  setPeerPubkey(parsed);
                  if (!parsed && peerInput.trim()) {
                    setError(
                      "Invalid peer key. Use npub... or 64-char hex pubkey.",
                    );
                  } else {
                    setError(null);
                  }
                }
              }}
              className="rounded border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11px] outline-none focus:border-cyan-500/60"
              placeholder="Peer npub... or hex pubkey"
            />
          )}
          <input
            value={relayInput}
            onChange={(e) => setRelayInput(e.target.value)}
            className="rounded border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11px] outline-none focus:border-cyan-500/60"
            placeholder="Relays (comma-separated wss://...)"
          />
        </div>
        {mode === "dm" && (
          <>
            <div className="mt-2 text-[9px] text-slate-600">
              Your shareable anonymous ID:{" "}
              <span className="text-slate-400">{myNpub}</span>
            </div>
            <div className="mt-2 rounded border border-white/[0.06] bg-white/[0.02] p-2">
              <div className="mb-1 text-[9px] uppercase tracking-widest text-slate-500">
                Contacts
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <input
                  value={contactNameInput}
                  onChange={(e) => setContactNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addContact();
                  }}
                  className="rounded border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11px] outline-none focus:border-cyan-500/60"
                  placeholder="Contact name"
                />
                <input
                  value={contactKeyInput}
                  onChange={(e) => setContactKeyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addContact();
                  }}
                  className="rounded border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11px] outline-none focus:border-cyan-500/60"
                  placeholder="npub... or hex key"
                />
                <button
                  onClick={addContact}
                  className="rounded bg-cyan-500/70 px-3 py-1 text-[11px] text-white"
                >
                  Add Contact
                </button>
              </div>
              {!!contacts.length && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {contacts.map((contact) => {
                    const selected = activeContact?.id === contact.id;
                    return (
                      <div
                        key={contact.id}
                        className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] ${
                          selected
                            ? "bg-cyan-500/20 text-cyan-100"
                            : "bg-white/[0.04] text-slate-300"
                        }`}
                      >
                        <button onClick={() => useContact(contact)}>
                          {contact.name}
                        </button>
                        <button
                          onClick={() => removeContact(contact.id)}
                          className="text-slate-500 hover:text-red-300"
                          title="Remove contact"
                        >
                          x
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2 py-3 sm:px-3"
      >
        {messages.map((m) => {
          const mine = m.pubkey === pkRef.current;
          return (
            <div
              key={m.id}
              className={`max-w-[92%] rounded px-2 py-1 text-[11px] ${
                mine
                  ? "ml-auto bg-cyan-500/20 text-cyan-100"
                  : "bg-white/[0.05] text-slate-300"
              }`}
            >
              <div className="mb-0.5 text-[9px] text-slate-500">
                {makeAnonLabel(m.pubkey)} ·{" "}
                {new Date(m.created_at * 1000).toLocaleTimeString()}
              </div>
              <div className="break-words">{m.content}</div>
            </div>
          );
        })}
        {!messages.length && (
          <div className="text-[11px] text-slate-600">
            {mode === "world"
              ? `No messages yet. Start chatting in #${toRoomTag(room)}.`
              : "No DM messages yet. Paste peer key and send a message."}
          </div>
        )}
      </div>

      <div className="flex-shrink-0 border-t border-white/[0.05] p-2 sm:p-3">
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void send();
            }}
            maxLength={MAX_LEN}
            className="flex-1 rounded border border-white/[0.08] bg-white/[0.03] px-2 py-1.5 text-[12px] outline-none focus:border-cyan-500/60"
            placeholder="Write anonymous message..."
          />
          <button
            onClick={() => void send()}
            disabled={isSending || !draft.trim()}
            className="rounded bg-cyan-500/80 px-3 py-1.5 text-[11px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send
          </button>
        </div>
        {error && <div className="mt-1 text-[10px] text-red-300">{error}</div>}
        <p className="mt-2 text-[9px] text-slate-600">
          Privacy note: identity is ephemeral. World mode is public-room chat.
          DM mode encrypts content end-to-end using NIP-04.
        </p>
      </div>
    </div>
  );
}
