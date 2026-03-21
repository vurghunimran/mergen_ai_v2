export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className="dashboard-sample min-h-screen bg-gray-50 text-[14px] text-gray-900"
      style={{
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      }}
    >
      {children}
    </div>
  );
}
