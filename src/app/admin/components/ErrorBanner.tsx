type ErrorBannerProps = {
  message?: string | null;
};

function ErrorBanner({ message }: ErrorBannerProps) {
  if (!message) return null;
  return <div className="admin-error">{message}</div>;
}

export default ErrorBanner;
