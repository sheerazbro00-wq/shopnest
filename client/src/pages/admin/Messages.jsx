import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { deleteAdminMessage, fetchAdminMessage, fetchAdminMessages, updateAdminMessage } from "../../api/admin";
import { errorMessage } from "../../api/orders";
import { AdminPage } from "../../components/admin/AdminLayout";
import ConfirmDialog from "../../components/admin/ConfirmDialog";
import { Badge } from "../../components/admin/OrdersTable";
import Toast, { useToast } from "../../components/admin/Toast";
import { fullDate, initials, mailto, shortDate } from "../../components/admin/format";
import "./Orders.css";
import "./Customers.css";
import "./Messages.css";

const TABS = [
  { value: "", label: "All", key: "All" },
  { value: "New", label: "New", key: "New" },
  { value: "Read", label: "Read", key: "Read" },
  { value: "Replied", label: "Replied", key: "Replied" },
];

const countsChanged = () => window.dispatchEvent(new Event("admin:counts-changed"));

// mailto: with a greeting, a signature and the customer's message quoted below.
function replyLink(m) {
  const first = m.name.split(/\s+/)[0];
  const quoted = m.message.slice(0, 1200).replace(/^/gm, "> ");
  const body = `Hi ${first},\n\n\n\nBest regards,\nShopNest Customer Care\n\n— On ${fullDate(m.createdAt)}, ${m.name} wrote:\n${quoted}`;
  return mailto(m.email, { subject: "Re: Your message to ShopNest", body });
}

function Reader({ id, backTo, onChanged, onDeleted }) {
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);
  const [replyOpened, setReplyOpened] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, showToast] = useToast();
  const headingRef = useRef(null);

  useEffect(() => {
    let alive = true;
    setMsg(null);
    setError("");
    setReplyOpened(false);
    fetchAdminMessage(id)
      .then(async (m) => {
        if (!alive) return;
        setMsg(m);
        // Opening a new message marks it as read (a separate PATCH — the GET stays side-effect free).
        if (m.status === "New") {
          const updated = await updateAdminMessage(id, "Read").catch(() => null);
          if (alive && updated) {
            setMsg(updated);
            onChanged(updated);
            countsChanged();
          }
        }
      })
      .catch((err) => alive && setError(errorMessage(err, "Couldn't load this message.")));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (msg) headingRef.current?.focus({ preventScroll: true });
  }, [msg?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const setStatus = async (status, done) => {
    setBusy(status);
    try {
      const updated = await updateAdminMessage(id, status);
      setMsg(updated);
      onChanged(updated);
      countsChanged();
      setReplyOpened(false);
      showToast(done);
    } catch (err) {
      showToast(errorMessage(err, "Something went wrong."), { error: true });
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy("delete");
    try {
      await deleteAdminMessage(id);
      countsChanged();
      onDeleted(id);
    } catch (err) {
      showToast(errorMessage(err, "Couldn't delete the message."), { error: true });
      setBusy(null);
      setConfirmDelete(false);
    }
  };

  const backLink = (
    <Link to={backTo} className="adm-btn od-icon-btn msg-back" aria-label="Back to messages">
      <svg viewBox="0 0 20 20" aria-hidden="true" className="adm-icon">
        <path d="M12 5 7 10l5 5" />
      </svg>
    </Link>
  );

  if (error) {
    return (
      <div className="adm-card msg-reader">
        <div className="msg-reader__bar">{backLink}</div>
        <p className="adm-error msg-reader__error">{error}</p>
      </div>
    );
  }

  if (!msg) {
    return (
      <div className="adm-card msg-reader" aria-busy="true">
        <div className="msg-reader__bar">{backLink}</div>
        <div className="msg-reader__body">
          <div className="adm-skeleton" style={{ height: 40, maxWidth: 320 }} />
          <div className="adm-skeleton" style={{ height: 120, marginTop: 20 }} />
        </div>
      </div>
    );
  }

  return (
    <article className="adm-card msg-reader" aria-labelledby="MsgFrom">
      <div className="msg-reader__bar">
        {backLink}
        <div className="msg-reader__tools">
          {msg.status === "Replied" ? (
            <button type="button" className="adm-btn" disabled={Boolean(busy)} onClick={() => setStatus("Read", "Marked as not replied")}>
              Mark as not replied
            </button>
          ) : (
            <button type="button" className="adm-btn" disabled={Boolean(busy)} onClick={() => setStatus("New", "Marked as unread")}>
              Mark as unread
            </button>
          )}
          <button type="button" className="adm-btn od-icon-btn msg-delete" aria-label="Delete message" disabled={Boolean(busy)} onClick={() => setConfirmDelete(true)}>
            <svg viewBox="0 0 20 20" aria-hidden="true" className="adm-icon">
              <path d="M4 6h12M8 6V4.5h4V6M6 6l.7 10h6.6L14 6M8.5 9v4.5M11.5 9v4.5" />
            </svg>
          </button>
        </div>
      </div>

      <div className="msg-reader__body">
        <header className="msg-reader__head">
          <span className="cust-avatar msg-reader__avatar" aria-hidden="true">
            {initials(msg.name)}
          </span>
          <div className="msg-reader__who">
            <h2 id="MsgFrom" ref={headingRef} tabIndex={-1}>
              {msg.name}
            </h2>
            <a href={mailto(msg.email)} className="adm-card__link">
              {msg.email}
            </a>
          </div>
          <div className="msg-reader__meta">
            <time className="adm-muted" dateTime={msg.createdAt}>
              {fullDate(msg.createdAt)}
            </time>
            {msg.status === "Replied" && <Badge label="Replied" tone="success" />}
          </div>
        </header>

        {/* Plain text only: React escapes it, so a message can never inject HTML. */}
        <div className="msg-reader__text">{msg.message}</div>

        <div className="msg-reader__context">
          {msg.customerKey ? (
            <Link to={`/admin/customers/${msg.customerKey}`} className="adm-card__link">
              View customer profile &amp; orders
            </Link>
          ) : (
            <span className="adm-muted">Not a customer yet — no account or orders with this email.</span>
          )}
          {msg.otherMessages > 0 && (
            <Link to={`/admin/messages?q=${encodeURIComponent(msg.email)}`} className="adm-card__link">
              {msg.otherMessages} other {msg.otherMessages === 1 ? "message" : "messages"} from this sender
            </Link>
          )}
        </div>

        {replyOpened && msg.status !== "Replied" && (
          <div className="msg-reader__prompt" role="status">
            <span>Sent your reply? Mark this conversation as replied so the team knows.</span>
            <button type="button" className="adm-btn adm-btn--primary" disabled={Boolean(busy)} onClick={() => setStatus("Replied", "Marked as replied")}>
              {busy === "Replied" ? "Saving…" : "Mark as replied"}
            </button>
          </div>
        )}

        <div className="msg-reader__actions">
          <a href={replyLink(msg)} className="adm-btn adm-btn--primary" onClick={() => setReplyOpened(true)}>
            <svg viewBox="0 0 20 20" aria-hidden="true" className="adm-icon">
              <path d="M8 5 3.5 9.5 8 14M4 9.5h7.5a5 5 0 0 1 5 5V16" />
            </svg>
            Reply by email
          </a>
          {msg.status !== "Replied" && !replyOpened && (
            <button type="button" className="adm-btn" disabled={Boolean(busy)} onClick={() => setStatus("Replied", "Marked as replied")}>
              Mark as replied
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this message?"
        confirmLabel="Delete"
        busy={busy === "delete"}
        onConfirm={remove}
        onClose={() => setConfirmDelete(false)}
      >
        <p>
          The message from <strong>{msg.name}</strong> will be removed permanently.
        </p>
      </ConfirmDialog>
      <Toast {...toast} />
    </article>
  );
}

export default function Messages() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const status = params.get("status") || "";
  const q = params.get("q") || "";
  const page = Math.max(1, parseInt(params.get("page")) || 1);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(q);
  const [reload, setReload] = useState(0);
  const [toast, showToast] = useToast();

  // Filters live in the query string, so they survive opening a message.
  const listPath = `/admin/messages${location.search}`;

  const update = (changes, { keepPage = false } = {}) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) (v ? next.set(k, v) : next.delete(k));
    if (!keepPage) next.delete("page");
    setParams(next, { replace: !("page" in changes) });
  };

  useEffect(() => {
    if (search === q) return;
    const t = setTimeout(() => update({ q: search.trim() }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => setSearch(q), [q]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetchAdminMessages({ status, q, page }, controller.signal)
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === "CanceledError") return;
        setError(errorMessage(err, "Couldn't load messages."));
        setLoading(false);
      });
    return () => controller.abort();
  }, [status, q, page, reload]);

  // Keep the list in step with the reader without refetching (and without
  // yanking a just-read message out of the "New" tab while it's open).
  const onChanged = (m) =>
    setData((d) => {
      if (!d) return d;
      const prev = d.messages.find((x) => x._id === m._id);
      if (!prev || prev.status === m.status) return d;
      const counts = { ...d.counts, [prev.status]: (d.counts[prev.status] || 1) - 1, [m.status]: (d.counts[m.status] || 0) + 1 };
      return { ...d, counts, messages: d.messages.map((x) => (x._id === m._id ? { ...x, status: m.status } : x)) };
    });

  const onDeleted = () => {
    showToast("Message deleted");
    navigate(listPath, { replace: true });
    setReload((n) => n + 1);
  };

  const from = data ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.page * data.pageSize, data.total) : 0;
  const newCount = data?.counts?.New || 0;

  return (
    <AdminPage title="Messages" subtitle={data ? (newCount ? `${newCount} new ${newCount === 1 ? "message" : "messages"} waiting` : "You're all caught up") : null}>
      {error && <p className="adm-error">{error}</p>}

      <div className={`msg-layout${id ? " has-selection" : ""}`}>
        <section className="adm-card orders-card msg-list" aria-label="Inbox">
          <div className="orders-tabs" role="tablist" aria-label="Filter by status">
            {TABS.map((t) => (
              <button key={t.key} type="button" role="tab" aria-selected={status === t.value} className={status === t.value ? "is-active" : ""} onClick={() => update({ status: t.value })}>
                {t.label}
                {data?.counts && <span className="orders-tabs__count">{data.counts[t.key] || 0}</span>}
              </button>
            ))}
          </div>

          <div className="orders-filters">
            <div className="orders-search">
              <svg viewBox="0 0 20 20" aria-hidden="true" className="adm-icon">
                <path d="M8.5 14a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM17 17l-4.5-4.5" />
              </svg>
              <label htmlFor="MessageSearch" className="visually-hidden">
                Search messages
              </label>
              <input id="MessageSearch" type="search" placeholder="Search name, email or text" value={search} onChange={(e) => setSearch(e.target.value)} autoComplete="off" />
            </div>
          </div>

          <div className={`orders-body msg-list__body${loading && data ? " is-loading" : ""}`} aria-busy={loading}>
            {loading && <div className="orders-progress" aria-hidden="true" />}
            {!data && loading && (
              <div className="orders-skeleton">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="adm-skeleton" style={{ height: 52 }} />
                ))}
              </div>
            )}

            {data && data.messages.length > 0 && (
              <ul className="msg-items">
                {data.messages.map((m) => (
                  <li key={m._id}>
                    <Link
                      to={`/admin/messages/${m._id}${location.search}`}
                      className={`msg-item${m.status === "New" ? " is-new" : ""}${m._id === id ? " is-selected" : ""}`}
                      aria-current={m._id === id ? "true" : undefined}
                    >
                      <span className="msg-item__dot" aria-hidden="true" />
                      <span className="msg-item__top">
                        <span className="msg-item__name">{m.name}</span>
                        <time className="msg-item__time" dateTime={m.createdAt}>
                          {shortDate(m.createdAt)}
                        </time>
                      </span>
                      <span className="msg-item__preview">{m.preview}</span>
                      {m.status === "New" && <span className="visually-hidden">Unread. </span>}
                      {m.status === "Replied" && (
                        <span className="msg-item__replied">
                          <svg viewBox="0 0 20 20" aria-hidden="true" className="adm-icon">
                            <path d="M8 5 3.5 9.5 8 14M4 9.5h7.5a5 5 0 0 1 5 5V16" />
                          </svg>
                          Replied
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {data && data.messages.length === 0 && (
              <div className="orders-empty">
                <h2>{q || status ? "No messages found" : "No messages yet"}</h2>
                <p>{q || status ? "Try a different search or filter." : "Messages sent from the Contact page will appear here."}</p>
                {(q || status) && (
                  <button type="button" className="adm-btn" onClick={() => setParams({}, { replace: true })}>
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>

          {data && data.pages > 1 && (
            <div className="orders-pager">
              <p className="adm-muted">
                {from}–{to} of {data.total}
              </p>
              <div className="orders-pager__btns">
                <button type="button" className="adm-btn" disabled={data.page <= 1} onClick={() => update({ page: String(data.page - 1) }, { keepPage: true })} aria-label="Previous page">
                  &lsaquo;
                </button>
                <button type="button" className="adm-btn" disabled={data.page >= data.pages} onClick={() => update({ page: String(data.page + 1) }, { keepPage: true })} aria-label="Next page">
                  &rsaquo;
                </button>
              </div>
            </div>
          )}
        </section>

        <div className="msg-pane">
          {id ? (
            <Reader key={id} id={id} backTo={listPath} onChanged={onChanged} onDeleted={onDeleted} />
          ) : (
            <div className="adm-card msg-placeholder">
              <svg viewBox="0 0 20 20" aria-hidden="true" className="adm-icon">
                <path d="M3.5 4.5h13v9h-8l-3.5 3v-3H3.5z" />
              </svg>
              <p>Select a message to read it</p>
            </div>
          )}
        </div>
      </div>
      <Toast {...toast} />
    </AdminPage>
  );
}
