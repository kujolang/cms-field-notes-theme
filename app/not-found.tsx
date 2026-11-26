import Link from "next/link";

export default function NotFound() {
  return (
    <main className="narrow-page">
      <Link className="back-link" href="/">← Field Notes</Link>
      <h1>Page not found.</h1>
    </main>
  );
}
