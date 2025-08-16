import { JobQueue, IngestJob } from '@core/jobs';
import { SupabaseClient } from '@supabase/supabase-js';

export class SupabaseJobQueue implements JobQueue {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    if (!client) {
      throw new Error("Supabase client is required");
    }
    this.client = client;
  }

  async enqueue(job: Omit<IngestJob, 'id' | 'stage' | 'error'>): Promise<{ id: string; }> {
    const { data, error } = await this.client
      .from('jobs')
      .insert({
        tenant_id: job.tenantId,
        source_id: job.sourceId,
        url: job.url,
        priority: job.priority,
        meta: job.meta,
        stage: 'queued',
      })
      .select('id')
      .single();

    if (error) {
      console.error("Error enqueuing job:", error);
      throw new Error(`Failed to enqueue job: ${error.message}`);
    }
    if (!data) {
      throw new Error("Enqueue operation did not return a job ID.");
    }

    return { id: data.id };
  }

  async lockNext(tenantId: string): Promise<IngestJob | null> {
    // Эта реализация упрощена для MVP. В продакшене здесь бы использовалась
    // транзакция с блокировкой строки (SELECT ... FOR UPDATE SKIP LOCKED).
    const { data, error } = await this.client
      .from('jobs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('stage', 'queued')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = "No rows found"
      console.error('Error locking next job:', error);
      throw new Error(error.message);
    }

    return data ? (data as IngestJob) : null;
  }

  async update(job: Partial<IngestJob> & { id: string }): Promise<void> {
    const { id, ...updateData } = job;
    const { error } = await this.client
      .from('jobs')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error(`Error updating job ${id}:`, error);
      throw new Error(error.message);
    }
  }
}