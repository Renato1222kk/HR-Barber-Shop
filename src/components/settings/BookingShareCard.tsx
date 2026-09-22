'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, QrCode, Share2, MessageCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { BOOKING_ROUTE, BRAND } from '@/lib/constants';

/**
 * Seção "Agendamento online" do painel: mostra o link público de
 * /agendar para o barbeiro compartilhar (Instagram, WhatsApp, balcão).
 *
 * O link é derivado do domínio atual (window.location.origin) — nunca de
 * uma URL de preview fixa. Em produção aponta para o domínio oficial.
 */
export function BookingShareCard() {
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  const link = origin ? `${origin}${BOOKING_ROUTE}` : '';
  const shareText = `Agende seu horário na ${BRAND.name}`;

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Área de transferência indisponível — o link continua visível no campo.
    }
  };

  const share = async () => {
    if (!link) return;
    if (canShare) {
      try {
        await navigator.share({ title: BRAND.name, text: shareText, url: link });
        return;
      } catch {
        // Cancelado ou não suportado: cai para copiar.
      }
    }
    copy();
  };

  const shareWhatsapp = () => {
    if (!link) return;
    const message = encodeURIComponent(`${shareText}: ${link}`);
    window.open(`https://wa.me/?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  // QR gerado por serviço externo (imagem simples, sem dependência no bundle).
  const qrSrc = link
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(link)}`
    : '';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-4 w-4 text-gold-600" /> Agendamento online
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs leading-relaxed text-ink-500">
          Compartilhe seu link de agendamento. Seus clientes escolhem serviço, data e horário
          direto pelo celular, sem precisar de conta.
        </p>

        <div>
          <p className="mb-1.5 text-xs font-medium text-ink-700">Seu link de agendamento</p>
          <div className="flex items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center rounded-xl border border-ink-200 bg-ink-50 px-3 py-2.5">
              <span className="truncate text-sm text-ink-700">
                {link || 'Carregando...'}
              </span>
            </div>
            <a
              href={link || BOOKING_ROUTE}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Abrir link"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ink-200 text-ink-600 transition-colors hover:bg-ink-100"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 xs:grid-cols-3">
          <Button variant="secondary" onClick={copy} disabled={!link}>
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copiado!' : 'Copiar link'}
          </Button>
          <Button variant="secondary" onClick={share} disabled={!link}>
            <Share2 className="h-4 w-4" />
            Compartilhar
          </Button>
          <Button variant="secondary" onClick={shareWhatsapp} disabled={!link}>
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </Button>
        </div>

        {/* QR Code para balcão, cartão, Instagram e panfleto. */}
        <div className="flex items-center gap-4 rounded-xl border border-ink-200 p-4">
          <div className="flex h-[100px] w-[100px] shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-ink-200">
            {qrSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrSrc}
                alt="QR Code do agendamento online"
                width={100}
                height={100}
                className="h-[92px] w-[92px]"
              />
            ) : (
              <QrCode className="h-8 w-8 text-ink-300" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-900">QR Code do agendamento</p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-500">
              Aponte a câmera para abrir o link. Ideal para o balcão, cartão de visita e
              Instagram.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
