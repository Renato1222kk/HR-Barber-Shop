import { BRAND } from '@/lib/constants';
import { formatDateFull, formatTime } from './format';

// Limpa o numero deixando apenas digitos e garante DDI 55.
export function normalizeWhatsapp(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55')) return digits;
  return `55${digits}`;
}

export function whatsappLink(number: string, message: string): string {
  const num = normalizeWhatsapp(number);
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

interface ConfirmationParams {
  name: string;
  date: string; // ISO
  time: string;
  service: string;
  business?: string;
}

export function confirmationMessage({
  name,
  date,
  time,
  service,
  business = BRAND.name,
}: ConfirmationParams): string {
  const firstName = name.split(' ')[0];
  return `Olá ${firstName}, seu horário na ${business} foi confirmado para ${formatDateFull(
    date
  )} às ${formatTime(time)}. Serviço: ${service}. Qualquer coisa me avise por aqui.`;
}

export function comebackMessage(name: string, business = BRAND.name): string {
  const firstName = name.split(' ')[0];
  return `Fala ${firstName}, tudo certo? Já faz um tempo desde seu último corte. Quer marcar um horário essa semana na ${business}?`;
}

// Mascara visual simples para exibir o numero.
export function formatWhatsappDisplay(raw: string): string {
  const d = (raw || '').replace(/\D/g, '').replace(/^55/, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return raw;
}
