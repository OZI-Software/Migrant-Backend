import * as cron from 'node-cron';
import GoogleNewsFeedService from './google-news-feed';

interface CronJobConfig {
  schedule: string;
  categories: string[];
  maxArticlesPerCategory: number;
  enabled: boolean;
}

class NewsCronJobService {
  private googleNewsService: GoogleNewsFeedService;
  private jobs: Map<string, any> = new Map();
  private isRunning: boolean = false;

  constructor() {
    this.googleNewsService = new GoogleNewsFeedService();
  }

  /**
   * Default cron job configurations
   * Updated to run every 2 hours for each allowed category as requested
   */
  private getDefaultConfigs(): Record<string, CronJobConfig> {
    // All valid categories that should be fetched (as defined in google-news-feed.ts)
    const allCategories = ['Politics', 'Economy', 'World', 'Security', 'Law', 'Science', 'Society', 'Culture', 'Sport'];
    
    return {
      // Every 2 hours - PRIMARY JOB - fetch ALL categories as requested by user
      allCategoriesEvery2Hours: {
        schedule: '0 */2 * * *', // Every 2 hours at minute 0
        categories: allCategories,
        maxArticlesPerCategory: 8, // Increased for better coverage
        enabled: true
      },
      // Backup job every 6 hours for comprehensive coverage
      allCategoriesBackup: {
        schedule: '30 */6 * * *', // Every 6 hours at minute 30 (offset to avoid conflicts)
        categories: allCategories,
        maxArticlesPerCategory: 5,
        enabled: true
      }
    };
  }

  /**
   * Execute news import job
   */
  private async executeNewsImport(jobName: string, config: CronJobConfig): Promise<void> {
    if (this.isRunning) {
      strapi.log.warn(`News import job ${jobName} skipped - another job is already running`);
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      strapi.log.info(`Starting scheduled news import job: ${jobName}`);
      strapi.log.info(`Categories: ${config.categories.join(', ')}`);
      strapi.log.info(`Max articles per category: ${config.maxArticlesPerCategory}`);

      const result = await this.googleNewsService.importNews(
        config.categories,
        config.maxArticlesPerCategory
      );

      const duration = Date.now() - startTime;
      
      strapi.log.info(`News import job ${jobName} completed in ${duration}ms`);
      strapi.log.info(`Results: ${result.imported} imported, ${result.skipped} skipped, ${result.errors} errors`);

      // Store job execution stats (optional - you can create a job-stats content type for this)
      await this.logJobExecution(jobName, result, duration);

    } catch (error) {
      strapi.log.error(`News import job ${jobName} failed:`, error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Log job execution statistics
   */
  private async logJobExecution(jobName: string, result: any, duration: number): Promise<void> {
    try {
      // You can create a job-stats content type to track this data
      strapi.log.info(`Job ${jobName} stats:`, {
        jobName,
        imported: result.imported,
        skipped: result.skipped,
        errors: result.errors,
        duration,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      strapi.log.error('Error logging job execution:', error);
    }
  }

  /**
   * Start all cron jobs
   */
  startAllJobs(): void {
    const configs = this.getDefaultConfigs();

    Object.entries(configs).forEach(([jobName, config]) => {
      if (config.enabled) {
        this.startJob(jobName, config);
      }
    });

    strapi.log.info('All news cron jobs started');
  }

  /**
   * Start a specific cron job
   */
  startJob(jobName: string, config: CronJobConfig): void {
    try {
      // Validate cron expression
      if (!cron.validate(config.schedule)) {
        throw new Error(`Invalid cron schedule: ${config.schedule}`);
      }

      // Stop existing job if running
      this.stopJob(jobName);

      // Create and start new job
      const task = cron.schedule(
        config.schedule,
        () => this.executeNewsImport(jobName, config),
        {
          timezone: 'UTC'
        }
      );
      this.jobs.set(jobName, task);

      strapi.log.info(`Started news cron job: ${jobName} with schedule: ${config.schedule}`);
    } catch (error) {
      strapi.log.error(`Failed to start cron job ${jobName}:`, error);
    }
  }

  /**
   * Stop a specific cron job
   */
  stopJob(jobName: string): void {
    const job = this.jobs.get(jobName);
    if (job) {
      job.stop();
      job.destroy();
      this.jobs.delete(jobName);
      strapi.log.info(`Stopped news cron job: ${jobName}`);
    }
  }

  /**
   * Stop all cron jobs
   */
  stopAllJobs(): void {
    this.jobs.forEach((job, jobName) => {
      job.stop();
      job.destroy();
      strapi.log.info(`Stopped news cron job: ${jobName}`);
    });
    this.jobs.clear();
    strapi.log.info('All news cron jobs stopped');
  }

  /**
   * Get status of all jobs
   */
  getJobsStatus(): Record<string, any> {
    const status = {};
    const configs = this.getDefaultConfigs();

    Object.keys(configs).forEach(jobName => {
      const job = this.jobs.get(jobName);
      status[jobName] = {
        running: job ? true : false,
        schedule: configs[jobName].schedule,
        categories: configs[jobName].categories,
        enabled: configs[jobName].enabled
      };
    });

    return status;
  }

  /**
   * Manually trigger a news import job
   */
  async triggerManualImport(
    categories: string[] = ['World'],
    maxArticlesPerCategory: number = 10
  ): Promise<any> {
    if (this.isRunning) {
      throw new Error('Another news import job is already running');
    }

    strapi.log.info('Triggering manual news import');
    
    const config: CronJobConfig = {
      schedule: '',
      categories,
      maxArticlesPerCategory,
      enabled: true
    };

    await this.executeNewsImport('manual', config);
    return { success: true, message: 'Manual import completed' };
  }

  /**
   * Update job configuration
   */
  updateJobConfig(jobName: string, config: Partial<CronJobConfig>): void {
    const configs = this.getDefaultConfigs();
    const currentConfig = configs[jobName];

    if (!currentConfig) {
      throw new Error(`Job ${jobName} not found`);
    }

    const updatedConfig = { ...currentConfig, ...config };
    
    // Restart job with new config
    if (updatedConfig.enabled) {
      this.startJob(jobName, updatedConfig);
    } else {
      this.stopJob(jobName);
    }

    strapi.log.info(`Updated configuration for job: ${jobName}`);
  }

  /**
   * Get current running status
   */
  isJobRunning(): boolean {
    return this.isRunning;
  }
}

export default NewsCronJobService;