export const FREQUENCIAS = { DIARIO: 'Diário', A_CADA_6H: 'A cada 6 horas', SEMANAL: 'Semanal' } as const;
export const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'] as const;
export interface ConcorrenteInput {
  nome: string; rede: string | null; cidade: string; estado: string; instagramHandle: string;
  autoScrapeEnabled: boolean; frequenciaScrape: keyof typeof FREQUENCIAS;
}
export interface ConcorrenteRegistro extends ConcorrenteInput {
  id: string; ultimoScrapeAt: string | null; createdAt: string; updatedAt: string; encartesCount: number;
}
