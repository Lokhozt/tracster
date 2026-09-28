import type { DocumentDisplayType } from "@/lib/document-type";

const tileClassName: Record<DocumentDisplayType, string> = {
  image: "bg-violet-100 text-violet-700",
  audio: "bg-amber-100 text-amber-800",
  video: "bg-sky-100 text-sky-700",
  pdf: "bg-red-100 text-red-700",
  word: "bg-blue-100 text-blue-700",
  spreadsheet: "bg-emerald-100 text-emerald-700",
  presentation: "bg-orange-100 text-orange-700",
  text: "bg-stone-200 text-stone-700",
  youtube: "bg-red-100 text-red-700",
  spotify: "bg-emerald-100 text-emerald-700",
  "google-document": "bg-blue-100 text-blue-700",
  "google-spreadsheet": "bg-emerald-100 text-emerald-700",
  "google-presentation": "bg-amber-100 text-amber-800",
  whatsapp: "bg-[#25D366]/20 text-[#128C7E]",
  link: "bg-stone-200 text-stone-700",
  file: "bg-stone-200 text-stone-700",
};

export function DocumentTypeIcon({
  type,
  label,
}: {
  type: DocumentDisplayType;
  label: string;
}) {
  return (
    <span
      className={`inline-flex size-10 shrink-0 items-center justify-center rounded-lg ${tileClassName[type]}`}
      title={label}
      aria-label={label}
      role="img"
    >
      <TypeGlyph type={type} />
    </span>
  );
}

function TypeGlyph({ type }: { type: DocumentDisplayType }) {
  if (type === "image") return <ImageGlyph />;
  if (type === "audio") return <AudioGlyph />;
  if (type === "video" || type === "youtube") return <VideoGlyph />;
  if (type === "pdf") return <PdfGlyph />;
  if (type === "word") return <LetterGlyph letter="W" />;
  if (type === "spreadsheet" || type === "google-spreadsheet") return <GridGlyph />;
  if (type === "presentation" || type === "google-presentation") return <SlidesGlyph />;
  if (type === "spotify") return <SpotifyGlyph />;
  if (type === "whatsapp") return <WhatsAppGlyph />;
  if (type === "link") return <LinkGlyph />;
  return <PageGlyph lines={type === "text" || type === "word" || type === "google-document"} />;
}

function Glyph({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true" fill="none">
      {children}
    </svg>
  );
}

function ImageGlyph() {
  return (
    <Glyph>
      <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="9" cy="10" r="1.4" fill="currentColor" />
      <path
        d="m4 16 4.2-4.2 3 3 2.6-3.2L20 16.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </Glyph>
  );
}

function AudioGlyph() {
  return (
    <Glyph>
      <path
        d="M9 17.5V6.5l9-2v9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7" cy="17.5" r="2.2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16" cy="13.5" r="2.2" stroke="currentColor" strokeWidth="1.8" />
    </Glyph>
  );
}

function VideoGlyph() {
  return (
    <Glyph>
      <rect x="3.5" y="6" width="17" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="m10.5 9.5 5 2.5-5 2.5v-5Z" fill="currentColor" />
    </Glyph>
  );
}

function PdfGlyph() {
  return (
    <Glyph>
      <path
        d="M7 3.5h7.2L18 7.3V20.5H7z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M14 3.5v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <text
        x="12.2"
        y="17"
        textAnchor="middle"
        fill="currentColor"
        fontSize="5.5"
        fontWeight="700"
      >
        PDF
      </text>
    </Glyph>
  );
}

function GridGlyph() {
  return (
    <Glyph>
      <rect x="4" y="4" width="16" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 9.5h16M4 14.5h16M9.5 4v16M14.5 4v16" stroke="currentColor" strokeWidth="1.8" />
    </Glyph>
  );
}

function SlidesGlyph() {
  return (
    <Glyph>
      <rect x="3.5" y="5" width="17" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 16v3M9 19h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </Glyph>
  );
}

function LetterGlyph({ letter }: { letter: string }) {
  return (
    <Glyph>
      <path
        d="M7 3.5h7.2L18 7.3V20.5H7z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M14 3.5v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <text x="12.2" y="17.2" textAnchor="middle" fill="currentColor" fontSize="7" fontWeight="700">
        {letter}
      </text>
    </Glyph>
  );
}

function PageGlyph({ lines }: { lines: boolean }) {
  return (
    <Glyph>
      <path
        d="M7 3.5h7.2L18 7.3V20.5H7z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M14 3.5v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      {lines && (
        <path
          d="M9.5 12h5M9.5 15h4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      )}
    </Glyph>
  );
}

function SpotifyGlyph() {
  return (
    <Glyph>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8 10.2c2.4-1 5.2-.8 7.6.6M8.4 13c2-.8 4.2-.6 6.2.5M8.8 15.6c1.6-.6 3.2-.4 4.6.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </Glyph>
  );
}

function WhatsAppGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function LinkGlyph() {
  return (
    <Glyph>
      <path
        d="M10 13.5 13.5 10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M11.2 8.2 12.8 6.6a3.2 3.2 0 0 1 4.6 4.6l-1.6 1.6M12.8 15.8l-1.6 1.6a3.2 3.2 0 0 1-4.6-4.6l1.6-1.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </Glyph>
  );
}
