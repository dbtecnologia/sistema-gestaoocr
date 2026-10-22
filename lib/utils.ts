import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export const brl = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
