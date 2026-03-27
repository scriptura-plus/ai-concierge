'use client';

const oldTestamentBooks = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles',
  'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
  'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah',
  'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
  'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah',
  'Haggai', 'Zechariah', 'Malachi',
];

const newTestamentBooks = [
  'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans',
  '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
  'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
  '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews',
  'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John',
  'Jude', 'Revelation',
];

function BookGrid({
  title,
  books,
}: {
  title: string;
  books: string[];
}) {
  return (
    <section className="w-full">
      <h2 className="mb-4 text-xl font-semibold text-gray-800">{title}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {books.map((book) => (
          <button
            key={book}
            type="button"
            className="rounded-xl border border-gray-200 bg-white px-4 py-4 text-left text-sm font-medium text-gray-800 shadow-sm transition hover:border-gray-400 hover:bg-gray-50"
          >
            {book}
          </button>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <p className="mb-2 text-sm font-medium uppercase tracking-wide text-gray-500">
            Step 1
          </p>
          <h1 className="text-3xl font-bold text-gray-900">Choose a Bible book</h1>
          <p className="mt-2 text-gray-600">
            Select a book to begin your verse-based insight study.
          </p>
        </header>

        <div className="space-y-10">
          <BookGrid title="Hebrew-Aramaic Scriptures" books={oldTestamentBooks} />
          <BookGrid title="Christian Greek Scriptures" books={newTestamentBooks} />
        </div>
      </div>
    </main>
  );
}
