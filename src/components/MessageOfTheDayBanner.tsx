export function MessageOfTheDayBanner({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="mb-6 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium whitespace-pre-line text-sky-950 sm:px-5"
    >
      {message}
    </div>
  );
}
