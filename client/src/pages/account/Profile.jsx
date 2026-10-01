import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as accountApi from "../../api/account";
import { errorMessage } from "../../api/orders";
import { useAuth } from "../../context/AuthContext";
import AccountLayout from "../../components/account/AccountLayout";
import AddressModal from "../../components/account/AddressModal";
import Field from "../../components/checkout/Field";
import PasswordField from "../../components/auth/PasswordField";
import { MIN_PASSWORD, passwordError } from "./validation";

const PencilIcon = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true" className="acc-icon">
    <path d="M13.5 3.5 16.5 6.5 7 16H4v-3z" />
  </svg>
);

function NameCard({ account, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const start = () => {
    setForm({ firstName: account.firstName || account.name || "", lastName: account.lastName || "" });
    setError("");
    setEditing(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim()) return setError("Enter your first name");
    setSaving(true);
    try {
      onSaved(await accountApi.updateAccount(form));
      setEditing(false);
    } catch (err) {
      setError(errorMessage(err));
    }
    setSaving(false);
  };

  return (
    <section className="acc-card">
      {editing ? (
        <form onSubmit={save} noValidate>
          <h2 className="acc-card__title">Edit name</h2>
          <div className="co-row">
            <Field label="First name" name="firstName" value={form.firstName} error={error} autoFocus onChange={(n, v) => { setForm((f) => ({ ...f, [n]: v })); setError(""); }} />
            <Field label="Last name" name="lastName" value={form.lastName} onChange={(n, v) => setForm((f) => ({ ...f, [n]: v }))} />
          </div>
          <div className="acc-actions">
            <button type="button" className="acc-btn-secondary" onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button type="submit" className="co-submit co-submit--inline" disabled={saving}>
              Save
            </button>
          </div>
        </form>
      ) : (
        <div className="acc-profile-grid">
          <div>
            <p className="acc-label">
              Name
              <button type="button" className="acc-icon-btn" aria-label="Edit name" onClick={start}>
                <PencilIcon />
              </button>
            </p>
            <p>{account.name}</p>
          </div>
          <div>
            <p className="acc-label">Email</p>
            <p>{account.email}</p>
          </div>
        </div>
      )}
    </section>
  );
}

function AddressesCard({ account, onSaved }) {
  const [modal, setModal] = useState(null); // null | {} (new) | address (edit)
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const close = useCallback(() => setModal(null), []);

  const save = async (fields) => {
    const updated = fields._id ? await accountApi.updateAddress(fields._id, fields) : await accountApi.addAddress(fields);
    onSaved(updated);
  };

  const run = async (id, fn) => {
    setBusyId(id);
    setError("");
    try {
      onSaved(await fn());
    } catch (err) {
      setError(errorMessage(err));
    }
    setBusyId(null);
  };

  return (
    <section className="acc-card">
      <div className="acc-card__head">
        <h2 className="acc-card__title">Addresses</h2>
        <button type="button" className="acc-link-btn" onClick={() => setModal({})}>
          + Add
        </button>
      </div>
      {error && <div className="co-banner">{error}</div>}
      {account.addresses.length === 0 ? (
        <p className="co-muted">No addresses added yet. Saved addresses fill in automatically at checkout.</p>
      ) : (
        <div className="acc-addresses">
          {account.addresses.map((a) => (
            <div key={a._id} className="acc-address">
              {a.isDefault && <span className="acc-badge">Default address</span>}
              <p>
                {a.firstName} {a.lastName}
                <br />
                {a.address}
                {a.apartment && (
                  <>
                    <br />
                    {a.apartment}
                  </>
                )}
                <br />
                {a.city} {a.postalCode}
                <br />
                {a.country}
                <br />
                {a.phone}
              </p>
              <div className="acc-address__actions">
                <button type="button" className="acc-link-btn" onClick={() => setModal(a)}>
                  Edit
                </button>
                {!a.isDefault && (
                  <button type="button" className="acc-link-btn" disabled={busyId === a._id} onClick={() => run(a._id, () => accountApi.updateAddress(a._id, { ...a, isDefault: true }))}>
                    Set as default
                  </button>
                )}
                <button
                  type="button"
                  className="acc-link-btn acc-link-btn--danger"
                  disabled={busyId === a._id}
                  onClick={() => window.confirm("Delete this address?") && run(a._id, () => accountApi.deleteAddress(a._id))}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal && <AddressModal initial={modal} onSave={save} onClose={close} />}
    </section>
  );
}

function PasswordCard() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ current: "", next: "" });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => ({ ...e, [name]: undefined, form: undefined }));
  };

  const save = async (e) => {
    e.preventDefault();
    const found = {};
    if (!form.current) found.current = "Enter your current password";
    const pw = passwordError(form.next);
    if (pw) found.next = pw;
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      await accountApi.changePassword(form.current, form.next);
      setMessage("Your password has been updated.");
      setForm({ current: "", next: "" });
      setOpen(false);
    } catch (err) {
      setErrors({ form: errorMessage(err) });
    }
    setSaving(false);
  };

  return (
    <section className="acc-card">
      <div className="acc-card__head">
        <h2 className="acc-card__title">Password</h2>
        {!open && (
          <button type="button" className="acc-link-btn" onClick={() => { setOpen(true); setMessage(""); }}>
            Change
          </button>
        )}
      </div>
      {message && <p className="acc-success">{message}</p>}
      {!open && !message && <p className="co-muted">••••••••</p>}
      {open && (
        <form onSubmit={save} noValidate>
          {errors.form && <div className="co-banner">{errors.form}</div>}
          <PasswordField label="Current password" name="current" autoComplete="current-password" value={form.current} error={errors.current} onChange={set} autoFocus />
          <PasswordField label="New password" name="next" autoComplete="new-password" value={form.next} error={errors.next} onChange={set} />
          {!errors.next && <p className="auth__hint">Use {MIN_PASSWORD} or more characters.</p>}
          <div className="acc-actions">
            <button type="button" className="acc-btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="co-submit co-submit--inline" disabled={saving}>
              Update password
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function MarketingCard({ account, onSaved }) {
  const [saving, setSaving] = useState(false);
  const toggle = async (checked) => {
    setSaving(true);
    try {
      onSaved(await accountApi.updateAccount({ acceptsMarketing: checked }));
    } catch {
      /* checkbox stays as it was */
    }
    setSaving(false);
  };

  return (
    <section className="acc-card">
      <h2 className="acc-card__title">Marketing preferences</h2>
      <label className="co-check">
        <input type="checkbox" checked={account.acceptsMarketing} disabled={saving} onChange={(e) => toggle(e.target.checked)} />
        <span className="co-check__box" />
        Email me with news and offers
      </label>
    </section>
  );
}

export default function Profile() {
  const { updateUser } = useAuth();
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [error, setError] = useState("");

  const saved = useCallback(
    (acc) => {
      setAccount(acc);
      updateUser({ name: acc.name, firstName: acc.firstName, lastName: acc.lastName });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    accountApi
      .fetchAccount()
      .then(setAccount)
      .catch((err) => setError(errorMessage(err, "Couldn't load your profile.")));
  }, []);

  return (
    <AccountLayout title="Profile">
      <h1 className="acc-title">Profile</h1>
      {error && <div className="co-banner">{error}</div>}
      {!account && !error && <div className="acc-card acc-skeleton" aria-busy="true" />}
      {account && (
        <div className="acc-stack">
          <NameCard account={account} onSaved={saved} />
          <AddressesCard account={account} onSaved={saved} />
          <PasswordCard />
          <MarketingCard account={account} onSaved={saved} />
          <button
            type="button"
            className="acc-logout"
            onClick={() => navigate("/", { replace: true, state: { signOut: true } })}
          >
            Log out
          </button>
        </div>
      )}
    </AccountLayout>
  );
}
