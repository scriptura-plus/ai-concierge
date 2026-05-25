export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f6f1e8",
        padding: "32px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: "720px",
          textAlign: "center",
          background: "#fffaf2",
          border: "1px solid #e8dcc7",
          borderRadius: "18px",
          padding: "48px 32px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
        }}
      >
        <h1
          style={{
            fontSize: "2rem",
            marginBottom: "24px",
            color: "#2b2b2b",
          }}
        >
          Scriptura
        </h1>

        <p
          style={{
            fontSize: "1.1rem",
            lineHeight: "1.7",
            color: "#444",
            marginBottom: "24px",
          }}
        >
          This legacy version of Scriptura is no longer maintained.
          <br />
          The new version is currently in private beta.
        </p>

        <p
          style={{
            fontSize: "1rem",
            lineHeight: "1.7",
            color: "#666",
          }}
        >
          Эта старая версия Scriptura больше не используется.
          <br />
          Новая версия сейчас находится в закрытой бете.
        </p>
      </div>
    </main>
  );
}
