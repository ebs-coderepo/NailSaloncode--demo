import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-5xl font-bold text-brand-600">404</p>
        <h1 className="mt-4 text-xl font-semibold text-gray-900">Page not found</h1>
        <p className="mt-2 text-gray-500">This page doesn&apos;t exist.</p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
