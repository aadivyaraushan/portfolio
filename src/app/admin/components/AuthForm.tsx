type AuthFormProps = {
  adminUser: string;
  adminPass: string;
  onUserChange: (value: string) => void;
  onPassChange: (value: string) => void;
  onSubmit: () => void;
  error?: string | null;
  pending?: boolean;
};

function AuthForm({
  adminUser,
  adminPass,
  onUserChange,
  onPassChange,
  onSubmit,
  error,
  pending = false,
}: AuthFormProps) {
  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <span className="admin-name">admin sign-in</span>
      </div>
      {pending ? (
        <div style={{ marginBottom: '10px', color: '#888' }}>verifying credentials…</div>
      ) : null}
      <input
        className="admin-textarea"
        style={{ minHeight: 'auto', height: '38px' }}
        placeholder="username"
        value={adminUser}
        onChange={(e) => onUserChange(e.target.value)}
        disabled={pending}
      />
      <input
        className="admin-textarea"
        type="password"
        style={{ minHeight: 'auto', height: '38px' }}
        placeholder="password"
        value={adminPass}
        onChange={(e) => onPassChange(e.target.value)}
        disabled={pending}
      />
      <button
        className="admin-send"
        type="button"
        onClick={onSubmit}
        disabled={!adminUser || !adminPass || pending}
      >
        continue
      </button>
      {error ? <div className="admin-error" style={{ marginTop: '10px' }}>{error}</div> : null}
    </div>
  );
}

export default AuthForm;
