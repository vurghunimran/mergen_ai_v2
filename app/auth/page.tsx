import AuthClient from "./AuthClient";

export default function AuthPage({
  searchParams
}: {
  searchParams?: { type?: string };
}) {
  return <AuthClient initialType={searchParams?.type} />;
}
