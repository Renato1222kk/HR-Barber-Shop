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

/**
 * Mascara progressiva para o campo de WhatsApp (celular brasileiro com
 * DDD). Aplica "(32) 98483-8707" enquanto a pessoa digita, cortando em 11
 * digitos. Usada na pagina publica de agendamento.
 */
export function maskWhatsappInput(raw: string): string {
  const d = (raw || '').replace(/\D/g, '').replace(/^55/, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Digitos locais (sem 55, sem mascara). Vazio quando incompleto. */
export function whatsappDigits(raw: string): string {
  return (raw || '').replace(/\D/g, '').replace(/^55/, '');
}

/** true quando o numero tem DDD + celular (10 ou 11 digitos). */
export function isValidWhatsapp(raw: string): boolean {
  const len = whatsappDigits(raw).length;
  return len === 10 || len === 11;
}

/** Mensagem pronta enviada pelo cliente apos agendar pelo link publico. */
export function bookingWhatsappMessage(params: {
  name: string;
  date: string; // ISO YYYY-MM-DD
  time: string; // HH:mm
  service?: string;
  business?: string;
}): string {
  const { name, date, time, service, business = BRAND.name } = params;
  const firstName = name.trim().split(' ')[0] || name.trim();
  const servicePart = service ? ` (${service})` : '';
  return `Olá! Meu nome é ${firstName}. Fiz um agendamento na ${business} para ${formatDateFull(
    date
  )} às ${formatTime(time)}${servicePart}.`;
}
