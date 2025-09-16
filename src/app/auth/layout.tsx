// src/app/auth/layout.tsx
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
