import { useState, useEffect, useRef, useCallback } from "react";
import {
  generateSecretKey,
  getPublicKey,
  finalizeEvent,
  nip04,
  nip19,
  SimplePool,
  type Event,
} from "nostr-tools";

// Public relays — messages route through these automatically
const RELAYS = [
  "wss://relay.damus.io",
  "wss://relay.nostr.band",
  "wss://nos.lol",
  "wss://relay.snort.social",
];

interface Message {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: number;
  sent: boolean; // true = I sent it
}

interface Contact {
  npub: string;
  hexPub: string;
  nickname: string;
  lastMessage?: string;
  lastTime?: number;
  unread: number;
}

interface Identity {
  nsec: string;
  npub: string;
  hexPriv: string;
  hexPub: string;
}

// Convert between hex and npub/nsec
function hexToNpub(hex: string): string {
  return nip19.npubEncode(hex);
}
function hexToNsec(hex: string): string {
  const bytes = new Uint8Array(
    hex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)),
  );
  return nip19.nsecEncode(bytes);
}
function npubToHex(npub: string): string | null {
  try {
    const decoded = nip19.decode(npub);
    if (decoded.type === "npub") return decoded.data as string;
    return null;
  } catch {
    return null;
  }
}
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
export default function Chat() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"connecting" | "connected" | "error">(
    "connecting",
  );
  const [view, setView] = useState<"setup" | "chat">("setup");
  const [addingContact, setAddingContact] = useState(false);
  const [newContactNpub, setNewContactNpub] = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [addError, setAddError] = useState("");
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  const poolRef = useRef<SimplePool | null>(null);
  const subRef = useRef<any>(null);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const allMessages = useRef<Map<string, Message[]>>(new Map());

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load or create identity from AXIOM vault (settings)
  useEffect(() => {
    initIdentity();
  }, []);

  const initIdentity = async () => {
    // Try to load existing identity from encrypted settings
    const stored = await window.axiom.settingsGet("chat_identity");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setIdentity(parsed);
        // Load contacts
        const storedContacts = await window.axiom.settingsGet("chat_contacts");
        if (storedContacts) {
          setContacts(JSON.parse(storedContacts));
        }
        setView("chat");
        return;
      } catch {
        /* corrupt, regenerate */
      }
    }
    setView("setup");
  };

  const generateIdentity = async () => {
    // Generate new Nostr keypair
    const privKeyBytes = generateSecretKey();
    const hexPriv = bytesToHex(privKeyBytes);
    const hexPub = getPublicKey(privKeyBytes);
    const npub = hexToNpub(hexPub);
    const nsec = hexToNsec(hexPriv);

    const id: Identity = { nsec, npub, hexPriv, hexPub };
    // Store encrypted in AXIOM vault
    await window.axiom.settingsSet("chat_identity", JSON.stringify(id));
    setIdentity(id);
    setView("chat");
  };

  // Connect to relays and subscribe to incoming DMs
  useEffect(() => {
    if (!identity || view !== "chat") return;

    const pool = new SimplePool();
    poolRef.current = pool;

    setStatus("connecting");

    // Subscribe to all DMs sent TO us
    const since = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
    const filters = [
      { kinds: [4], "#p": [identity.hexPub], since },
      { kinds: [4], authors: [identity.hexPub], since },
    ] as any;

    const sub = pool.subscribeMany(RELAYS, filters, {
      onevent: async (event: Event) => {
        await handleIncomingEvent(event, identity);
        setStatus("connected");
      },
      oneose: () => {
        setStatus("connected");
      },
    });

    subRef.current = sub;

    return () => {
      sub.close();
      pool.close(RELAYS);
    };
  }, [identity, view]);

  const handleIncomingEvent = useCallback(
    async (event: Event, id: Identity) => {
      try {
        const isSent = event.pubkey === id.hexPub;
        const otherHex = isSent
          ? event.tags.find((t) => t[0] === "p")?.[1]
          : event.pubkey;

        if (!otherHex) return;

        // Decrypt the message
        const privBytes = new Uint8Array(
          identity.hexPriv.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)),
        );
        const decrypted = await nip04.decrypt(
          privBytes,
          otherHex,
          event.content,
        );

        const msg: Message = {
          id: event.id,
          from: event.pubkey,
          to: otherHex,
          content: decrypted,
          timestamp: event.created_at * 1000,
          sent: isSent,
        };

        // Store in allMessages map keyed by contact hex
        const contactKey = otherHex;
        const existing = allMessages.current.get(contactKey) || [];
        if (!existing.find((m) => m.id === msg.id)) {
          const updated = [...existing, msg].sort(
            (a, b) => a.timestamp - b.timestamp,
          );
          allMessages.current.set(contactKey, updated);

          // Update contact's last message
          setContacts((prev) =>
            prev.map((c) =>
              c.hexPub === contactKey
                ? {
                    ...c,
                    lastMessage: decrypted.slice(0, 40),
                    lastTime: msg.timestamp,
                    unread: isSent ? c.unread : c.unread + 1,
                  }
                : c,
            ),
          );

          // If this contact is active, update messages
          setActiveContact((prev) => {
            if (prev?.hexPub === contactKey) {
              setMessages(allMessages.current.get(contactKey) || []);
            }
            return prev;
          });
        }
      } catch (err) {
        // Decryption failed — message from unknown contact, ignore
      }
    },
    [],
  );

  const sendMessage = async () => {
    if (!input.trim() || !activeContact || !identity || sending) return;
    setSending(true);
    const text = input.trim();
    setInput("");

    try {
      const privBytes = new Uint8Array(
        identity.hexPriv.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)),
      );

      // Encrypt with NIP-04
      const encrypted = await nip04.encrypt(
        privBytes,
        activeContact.hexPub,
        text,
      );

      // Build and sign the event
      const event = finalizeEvent(
        {
          kind: 4,
          created_at: Math.floor(Date.now() / 1000),
          tags: [["p", activeContact.hexPub]],
          content: encrypted,
        },
        privBytes,
      );

      // Publish to all relays
      await Promise.any(poolRef.current!.publish(RELAYS, event));

      // Add to local state immediately (optimistic)
      const msg: Message = {
        id: event.id,
        from: identity.hexPub,
        to: activeContact.hexPub,
        content: text,
        timestamp: event.created_at * 1000,
        sent: true,
      };

      const existing = allMessages.current.get(activeContact.hexPub) || [];
      if (!existing.find((m) => m.id === msg.id)) {
        const updated = [...existing, msg];
        allMessages.current.set(activeContact.hexPub, updated);
        setMessages(updated);
        setContacts((prev) =>
          prev.map((c) =>
            c.hexPub === activeContact.hexPub
              ? {
                  ...c,
                  lastMessage: text.slice(0, 40),
                  lastTime: msg.timestamp,
                }
              : c,
          ),
        );
      }
    } catch (err) {
      console.error("Send failed:", err);
      setInput(text); // restore on failure
    }
    setSending(false);
  };

  const addContact = async () => {
    setAddError("");
    const hex = npubToHex(newContactNpub.trim());
    if (!hex) {
      setAddError("Invalid AXIOM ID. Must start with npub1...");
      return;
    }
    if (hex === identity?.hexPub) {
      setAddError("That's your own ID!");
      return;
    }
    if (contacts.find((c) => c.hexPub === hex)) {
      setAddError("Contact already added.");
      return;
    }

    const contact: Contact = {
      npub: newContactNpub.trim(),
      hexPub: hex,
      nickname: newContactName.trim() || `User ${contacts.length + 1}`,
      unread: 0,
    };

    const updated = [...contacts, contact];
    setContacts(updated);
    await window.axiom.settingsSet("chat_contacts", JSON.stringify(updated));
    setNewContactNpub("");
    setNewContactName("");
    setAddingContact(false);
    selectContact(contact);
  };

  const selectContact = (contact: Contact) => {
    setActiveContact(contact);
    const msgs = allMessages.current.get(contact.hexPub) || [];
    setMessages(msgs);
    // Clear unread
    setContacts((prev) =>
      prev.map((c) => (c.hexPub === contact.hexPub ? { ...c, unread: 0 } : c)),
    );
  };

  const copyId = () => {
    navigator.clipboard.writeText(identity?.npub || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday
      ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // Setup screen
  if (view === "setup") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 px-8">
        <div className="text-4xl">🔐</div>
        <div className="text-center">
          <h2 className="text-sm font-semibold text-slate-200 mb-1">
            AXIOM Chat
          </h2>
          <p className="text-[10px] text-slate-600 leading-relaxed max-w-xs">
            Anonymous encrypted messaging powered by Nostr. No email, no phone
            number — just a unique cryptographic ID. Messages are end-to-end
            encrypted. Relays never see your content.
          </p>
        </div>
        <div className="w-full max-w-xs bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
          <div className="text-[9px] text-slate-600 uppercase tracking-widest text-center">
            What happens when you click below
          </div>
          {[
            ["🔑", "A unique keypair is generated on your device"],
            ["🔒", "Your private key is stored in AXIOM's encrypted vault"],
            ["📡", "Your public key becomes your AXIOM Chat ID"],
            ["💬", "Messages encrypted before leaving your device"],
          ].map(([icon, text]) => (
            <div key={text} className="flex items-start gap-3">
              <span className="text-base flex-shrink-0">{icon}</span>
              <span className="text-[10px] text-slate-500 leading-relaxed">
                {text}
              </span>
            </div>
          ))}
        </div>
        <button
          onClick={generateIdentity}
          className="px-8 py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold tracking-widest uppercase hover:bg-cyan-500/20 transition-all"
        >
          Generate My AXIOM ID
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-52 border-r border-white/[0.05] flex flex-col flex-shrink-0">
        {/* My ID */}
        <div className="p-3 border-b border-white/[0.05]">
          <div className="text-[8px] text-slate-700 uppercase tracking-widest mb-1.5">
            Your AXIOM ID
          </div>
          <div className="flex items-center gap-1.5">
            <code className="text-[8px] text-cyan-500 font-mono truncate flex-1 bg-cyan-500/5 px-2 py-1 rounded">
              {identity?.npub.slice(0, 20)}...
            </code>
            <button
              onClick={copyId}
              className="text-[8px] text-slate-600 hover:text-cyan-400 transition-colors flex-shrink-0 px-1.5 py-1 border border-white/[0.07] rounded"
            >
              {copied ? "✓" : "Copy"}
            </button>
          </div>
          {/* Relay status indicator */}
          <div className="flex items-center gap-1.5 mt-2">
            <div
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                status === "connected"
                  ? "bg-green-400"
                  : status === "connecting"
                    ? "bg-yellow-400 animate-pulse"
                    : "bg-red-400"
              }`}
            />
            <span className="text-[8px] text-slate-700">
              {status === "connected"
                ? "Connected to relays"
                : status === "connecting"
                  ? "Connecting..."
                  : "Connection error"}
            </span>
          </div>
        </div>

        {/* Contacts */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.04]">
          <span className="text-[8px] text-slate-700 uppercase tracking-widest font-bold">
            Contacts
          </span>
          <button
            onClick={() => setAddingContact(true)}
            className="text-cyan-400 text-base leading-none hover:text-cyan-300 transition-colors"
          >
            +
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {contacts.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <p className="text-[9px] text-slate-700 leading-relaxed">
                No contacts yet. Add a contact using their AXIOM ID (npub1...).
              </p>
            </div>
          ) : (
            contacts.map((c) => (
              <div
                key={c.hexPub}
                onClick={() => selectContact(c)}
                className={`px-3 py-2.5 cursor-pointer border-b border-white/[0.03] transition-colors
                  ${
                    activeContact?.hexPub === c.hexPub
                      ? "bg-cyan-500/[0.07] border-l-2 border-l-cyan-500"
                      : "hover:bg-white/[0.03]"
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-300 truncate">
                    {c.nickname}
                  </span>
                  {c.unread > 0 && (
                    <span className="text-[8px] bg-cyan-500 text-black font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">
                      {c.unread}
                    </span>
                  )}
                </div>
                {c.lastMessage && (
                  <div className="text-[8px] text-slate-700 truncate mt-0.5">
                    {c.lastMessage}
                  </div>
                )}
                {c.lastTime && (
                  <div className="text-[7px] text-slate-800 mt-0.5">
                    {formatTime(c.lastTime)}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Add Contact Modal */}
        {addingContact && (
          <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center">
            <div className="bg-[#0e0e1e] border border-white/[0.08] rounded-2xl p-6 flex flex-col gap-4 w-80">
              <div className="text-[11px] font-semibold text-slate-200">
                Add Contact
              </div>
              <div>
                <label className="text-[9px] text-slate-600 uppercase tracking-widest block mb-1.5">
                  Their AXIOM ID (npub1...)
                </label>
                <input
                  value={newContactNpub}
                  onChange={(e) => setNewContactNpub(e.target.value)}
                  placeholder="npub1..."
                  className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.07] rounded-xl text-slate-200 text-[11px] outline-none focus:border-cyan-500/40 font-mono"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-600 uppercase tracking-widest block mb-1.5">
                  Nickname (optional)
                </label>
                <input
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="e.g. Alice"
                  onKeyDown={(e) => e.key === "Enter" && addContact()}
                  className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.07] rounded-xl text-slate-200 text-[11px] outline-none focus:border-cyan-500/40"
                />
              </div>
              {addError && (
                <p className="text-[10px] text-red-400">{addError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={addContact}
                  className="flex-1 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-[11px] hover:bg-cyan-500/18"
                >
                  Add Contact
                </button>
                <button
                  onClick={() => {
                    setAddingContact(false);
                    setAddError("");
                  }}
                  className="px-4 py-2.5 rounded-xl border border-white/[0.07] text-slate-500 text-[11px]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {!activeContact ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-700">
            <span className="text-5xl opacity-20">💬</span>
            <p className="text-[11px]">Select a contact to start chatting</p>
            <p className="text-[9px] text-slate-800 max-w-xs text-center leading-relaxed">
              Share your AXIOM ID with friends so they can message you. All
              messages are end-to-end encrypted.
            </p>
            <button
              onClick={() => setAddingContact(true)}
              className="mt-2 text-[10px] text-cyan-400 border border-cyan-500/25 px-4 py-2 rounded-lg hover:bg-cyan-500/10"
            >
              + Add First Contact
            </button>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.05] flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-white/10 flex items-center justify-center text-xs font-bold text-purple-300">
                {activeContact.nickname[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium text-slate-200">
                  {activeContact.nickname}
                </div>
                <div className="text-[8px] text-slate-700 font-mono truncate">
                  {activeContact.npub}
                </div>
              </div>
              <div
                className={`w-2 h-2 rounded-full ${status === "connected" ? "bg-green-400" : "bg-yellow-400 animate-pulse"}`}
              />
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-800">
                  <span className="text-3xl opacity-20">🔐</span>
                  <p className="text-[10px]">No messages yet. Say hello!</p>
                  <p className="text-[9px] text-slate-800 text-center">
                    All messages are encrypted end-to-end via Nostr NIP-04
                  </p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const prevMsg = messages[i - 1];
                  const showTime =
                    !prevMsg ||
                    msg.timestamp - prevMsg.timestamp > 5 * 60 * 1000;

                  return (
                    <div key={msg.id}>
                      {showTime && (
                        <div className="text-center my-2">
                          <span className="text-[8px] text-slate-800 bg-white/[0.02] px-3 py-1 rounded-full">
                            {formatTime(msg.timestamp)}
                          </span>
                        </div>
                      )}
                      <div
                        className={`flex ${msg.sent ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[72%] px-3 py-2 rounded-2xl text-[11px] leading-relaxed break-words
                          ${
                            msg.sent
                              ? "bg-cyan-500/20 border border-cyan-500/20 text-slate-200 rounded-br-sm"
                              : "bg-white/[0.06] border border-white/[0.07] text-slate-300 rounded-bl-sm"
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEnd} />
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 px-4 py-3 border-t border-white/[0.05] flex-shrink-0">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={`Message ${activeContact.nickname}...`}
                disabled={status !== "connected" || sending}
                className="flex-1 px-4 py-2.5 bg-white/[0.04] border border-white/[0.07] rounded-xl text-slate-200 text-[11px] outline-none focus:border-cyan-500/30 disabled:opacity-40 placeholder:text-slate-700"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || status !== "connected" || sending}
                className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/25 text-cyan-400 flex items-center justify-center hover:bg-cyan-500/25 transition-all disabled:opacity-30 flex-shrink-0"
              >
                {sending ? (
                  <span className="text-[8px] animate-pulse">...</span>
                ) : (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" />
                  </svg>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
