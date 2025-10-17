// src/components/CopyButton.jsx
'use client';

export default function CopyButton({ text }) {
  async function onCopy() {
    try { await navigator.clipboard.writeText(text || ''); } catch {}
  }
  return (
    <button onClick={onCopy} type="button" className="text-xs text-slate-600 hover:text-black">
      Copy
    </button>
  );
}
