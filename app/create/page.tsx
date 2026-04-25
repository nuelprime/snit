'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, usePublicClient, useWalletClient } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { useRouter } from 'next/navigation';
import type { Duration, EndCondition } from '@/lib/types';
import { MIN_PAID_PRICE_ETH } from '@/lib/types';

interface DropFormState {
  title: string;
  description: string;
  file: File | null;
  filePreviewUrl: string;
  mintPriceEth: string;       // user-friendly, e.g. "0.000259"
  startMode: 'now' | 'scheduled';
  startTime: string;          // ISO datetime-local
  duration: Duration;
  customDurationDays: number;
  endCondition: EndCondition;
  maxSupply: string;          // "0" or specific
}

const initialState: DropFormState = {
  title: '',
  description: '',
  file: null,
  filePreviewUrl: '',
  mintPriceEth: '0.00037',
  startMode: 'now',
  startTime: '',
  duration: '3d',
  customDurationDays: 3,
  endCondition: 'time_only',
  maxSupply: '0',
};

export default function CreateDropPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [form, setForm] = useState<DropFormState>(initialState);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'idle' | 'uploading' | 'splits' | 'deploying' | 'done'>('idle');

  // Auto-connect to FC wallet when miniapp loads
  useEffect(() => {
    if (!isConnected && connectors[0]) {
      connect({ connector: connectors[0] });
    }
  }, [isConnected, connect, connectors]);

  function update<K extends keyof DropFormState>(key: K, value: DropFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    update('file', file);
    update('filePreviewUrl', URL.createObjectURL(file));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isConnected || !address || !walletClient || !publicClient) {
      setError('Please connect your wallet');
      return;
    }
    if (!form.file) {
      setError('Please upload art');
      return;
    }
    if (!form.title.trim()) {
      setError('Title required');
      return;
    }

    // Price floor: must be 0 (free) or >= MIN_PAID_PRICE_ETH.
    // We compare in wei to avoid float precision issues.
    let priceWei: bigint;
    try {
      priceWei = parseEther(form.mintPriceEth || '0');
    } catch {
      setError('Invalid mint price');
      return;
    }
    const minWei = parseEther(MIN_PAID_PRICE_ETH);
    if (priceWei !== 0n && priceWei < minWei) {
      setError(`Mint price must be 0 (free) or at least ${MIN_PAID_PRICE_ETH} ETH`);
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upload media to backend (which puts it on VPS storage)
      setStep('uploading');
      const fd = new FormData();
      fd.append('file', form.file);
      fd.append('title', form.title);
      fd.append('description', form.description);

      const uploadRes = await fetch('/api/drops/upload', { method: 'POST', body: fd });
      if (!uploadRes.ok) throw new Error('Upload failed');
      const { mediaUri, metadataUri } = (await uploadRes.json()) as {
        mediaUri: string;
        metadataUri: string;
      };

      // 2. Compute time window
      const now = Math.floor(Date.now() / 1000);
      const start = form.startMode === 'now'
        ? now
        : Math.floor(new Date(form.startTime).getTime() / 1000);

      const durationSecs = (() => {
        switch (form.duration) {
          case '24h': return 24 * 60 * 60;
          case '3d': return 3 * 24 * 60 * 60;
          case '7d': return 7 * 24 * 60 * 60;
          case 'custom': return form.customDurationDays * 24 * 60 * 60;
        }
      })();

      // For supply-only drops, send saleEnd far in the future (uint64 max-ish)
      const end = form.endCondition === 'supply_only'
        ? Number.MAX_SAFE_INTEGER
        : start + durationSecs;

      // 3. Prep the drop record on backend (returns dropId + suggested splits config)
      const prepRes = await fetch('/api/drops/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          mediaUri,
          mintPriceWei: parseEther(form.mintPriceEth || '0').toString(),
          startTime: start,
          endTime: end,
          duration: form.duration,
          endCondition: form.endCondition,
          maxSupply: form.maxSupply,
          creatorAddress: address,
        }),
      });
      if (!prepRes.ok) throw new Error('Failed to prepare drop');
      const { dropId } = (await prepRes.json()) as { dropId: string };

      // 4. Deploy on-chain (splits + zora) — this triggers wallet sheet
      setStep('splits');
      const { deployFromClient } = await import('@/lib/deploy-client');
      const result = await deployFromClient({
        dropId,
        creatorAddress: address,
        splitsArtistAddress: address,
        title: form.title,
        contractURI: metadataUri,
        tokenURI: metadataUri,
        pricePerTokenWei: parseEther(form.mintPriceEth || '0'),
        saleStart: BigInt(start),
        saleEnd: BigInt(end),
        maxSupply: BigInt(form.maxSupply || '0'),
        publicClient,
        walletClient,
        onStep: (s) => setStep(s),
      });

      // 5. Confirm with backend
      await fetch(`/api/drops/${dropId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractAddress: result.contractAddress,
          tokenId: result.tokenId.toString(),
          splitsAddress: result.splitsAddress,
          deployTxHash: result.deployTxHash,
        }),
      });

      setStep('done');
      router.push(`/drops/${dropId}`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStep('idle');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen px-6 py-8 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">create a drop</h1>

      {!isConnected && (
        <div className="mb-6 p-4 bg-snit-surface rounded-lg text-sm text-snit-muted">
          Connecting to your Farcaster wallet…
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Piece upload */}
        <Field label="Piece">
          <input
            type="file"
            accept="image/*,video/mp4"
            onChange={onFileChange}
            className="block w-full text-sm text-snit-muted file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-snit-accent file:text-white file:font-semibold"
          />
          {form.filePreviewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.filePreviewUrl} alt="preview" className="mt-3 max-h-64 rounded" />
          )}
        </Field>

        <Field label="Title">
          <Input
            value={form.title}
            onChange={(v) => update('title', v)}
            placeholder="my first snit"
            maxLength={64}
          />
        </Field>

        <Field label="Description (optional)">
          <Textarea
            value={form.description}
            onChange={(v) => update('description', v)}
            placeholder="a short blurb about this drop"
            maxLength={500}
          />
        </Field>

        <Field label="Mint price (ETH)">
          <Input
            type="number"
            step="0.000001"
            min="0"
            value={form.mintPriceEth}
            onChange={(v) => update('mintPriceEth', v)}
            placeholder="0.00037"
          />
          <p className="text-xs text-snit-muted mt-1">
            0/0.00037/↑
          </p>
        </Field>

        <Field label="When does it end?">
          <div className="flex gap-2 flex-wrap">
            {(['time_only', 'supply_only', 'time_or_supply'] as EndCondition[]).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => update('endCondition', opt)}
                className={`px-3 py-2 text-sm rounded border ${
                  form.endCondition === opt
                    ? 'border-snit-accent bg-snit-accent/10'
                    : 'border-snit-border'
                }`}
              >
                {opt === 'time_only' ? 'time' : opt === 'supply_only' ? 'supply' : 'either'}
              </button>
            ))}
          </div>
        </Field>

        {form.endCondition !== 'supply_only' && (
          <Field label="Duration">
            <div className="flex gap-2 flex-wrap">
              {(['24h', '3d', '7d', 'custom'] as Duration[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => update('duration', d)}
                  className={`px-3 py-2 text-sm rounded border ${
                    form.duration === d
                      ? 'border-snit-accent bg-snit-accent/10'
                      : 'border-snit-border'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            {form.duration === 'custom' && (
              <Input
                type="number"
                min={1}
                value={String(form.customDurationDays)}
                onChange={(v) => update('customDurationDays', Number(v))}
                placeholder="days"
              />
            )}
          </Field>
        )}

        {form.endCondition !== 'time_only' && (
          <Field label="Max supply">
            <Input
              type="number"
              min={1}
              value={form.maxSupply === '0' ? '' : form.maxSupply}
              onChange={(v) => update('maxSupply', v || '0')}
              placeholder="e.g. 1000"
            />
          </Field>
        )}

        <Field label="When does it start?">
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => update('startMode', 'now')}
              className={`px-3 py-2 text-sm rounded border ${
                form.startMode === 'now'
                  ? 'border-snit-accent bg-snit-accent/10'
                  : 'border-snit-border'
              }`}
            >
              now
            </button>
            <button
              type="button"
              onClick={() => update('startMode', 'scheduled')}
              className={`px-3 py-2 text-sm rounded border ${
                form.startMode === 'scheduled'
                  ? 'border-snit-accent bg-snit-accent/10'
                  : 'border-snit-border'
              }`}
            >
              schedule
            </button>
          </div>
          {form.startMode === 'scheduled' && (
            <Input
              type="datetime-local"
              value={form.startTime}
              onChange={(v) => update('startTime', v)}
            />
          )}
        </Field>

        {error && (
          <div className="p-3 bg-red-900/30 border border-red-800 rounded text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !isConnected}
          className="w-full py-3 font-semibold rounded-lg transition bg-snit-accent text-white hover:opacity-90 disabled:bg-snit-surface disabled:text-snit-muted disabled:cursor-not-allowed disabled:hover:opacity-100"
        >
          {step === 'idle' && 'deploy drop'}
          {step === 'uploading' && 'uploading art...'}
          {step === 'splits' && 'deploying splits contract...'}
          {step === 'deploying' && 'deploying drop on-chain...'}
          {step === 'done' && 'done!'}
        </button>
      </form>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm tracking-wide text-snit-muted mb-2">
        {label}
      </span>
      {children}
    </label>
  );
}

function Input({
  type = 'text',
  value,
  onChange,
  placeholder,
  ...rest
}: {
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  [key: string]: any;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 bg-snit-surface border border-snit-border rounded text-snit-fg placeholder:text-snit-muted focus:outline-none focus:border-snit-accent"
      {...rest}
    />
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      rows={3}
      className="w-full px-3 py-2 bg-snit-surface border border-snit-border rounded text-snit-fg placeholder:text-snit-muted focus:outline-none focus:border-snit-accent resize-none"
    />
  );
}
