export type JobStage = 'queued'|'fetch'|'extract'|'chunk'|'embed'|'store'|'done'|'failed';

export interface IngestJob {
  id: string;
  tenantId: string;
  sourceId?: string;
  url: string;
  stage: JobStage;
  priority?: number;
  retries?: number;
  meta?: Record<string, any>;
  error?: string; // <-- Добавлено это поле
}

export interface JobQueue {
  enqueue(job: Omit<IngestJob, 'id'|'stage'|'error'>): Promise<{ id: string }>;
  lockNext(tenantId: string): Promise<IngestJob | null>; // для воркера
  update(job: Partial<IngestJob> & { id: string }): Promise<void>;
}