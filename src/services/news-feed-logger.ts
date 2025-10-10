interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  service: string;
  operation: string;
  message: string;
  data?: any;
  error?: any;
}

interface JobStats {
  jobName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  imported: number;
  skipped: number;
  errors: number;
  categories: string[];
  status: 'running' | 'completed' | 'failed';
  errorDetails?: any[];
}

class NewsFeedLogger {
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;
  private jobStats: Map<string, JobStats> = new Map();

  /**
   * Create a log entry
   */
  private createLogEntry(
    level: LogEntry['level'],
    service: string,
    operation: string,
    message: string,
    data?: any,
    error?: any
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      service,
      operation,
      message,
      data,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : undefined
    };
  }

  /**
   * Add log entry to internal storage and Strapi logs
   */
  private addLog(entry: LogEntry): void {
    // Add to internal storage
    this.logs.push(entry);
    
    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Log to Strapi logger
    const logMessage = `[${entry.service}:${entry.operation}] ${entry.message}`;
    const logData = entry.data ? ` | Data: ${JSON.stringify(entry.data)}` : '';
    const fullMessage = `${logMessage}${logData}`;

    switch (entry.level) {
      case 'error':
        strapi.log.error(fullMessage, entry.error);
        break;
      case 'warn':
        strapi.log.warn(fullMessage);
        break;
      case 'debug':
        strapi.log.debug(fullMessage);
        break;
      default:
        strapi.log.info(fullMessage);
    }
  }

  /**
   * Log info message
   */
  info(service: string, operation: string, message: string, data?: any): void {
    const entry = this.createLogEntry('info', service, operation, message, data);
    this.addLog(entry);
  }

  /**
   * Log warning message
   */
  warn(service: string, operation: string, message: string, data?: any): void {
    const entry = this.createLogEntry('warn', service, operation, message, data);
    this.addLog(entry);
  }

  /**
   * Log error message
   */
  error(service: string, operation: string, message: string, error?: any, data?: any): void {
    const entry = this.createLogEntry('error', service, operation, message, data, error);
    this.addLog(entry);
  }

  /**
   * Log debug message
   */
  debug(service: string, operation: string, message: string, data?: any): void {
    const entry = this.createLogEntry('debug', service, operation, message, data);
    this.addLog(entry);
  }

  /**
   * Start tracking a job
   */
  startJob(jobName: string, categories: string[]): void {
    const stats: JobStats = {
      jobName,
      startTime: Date.now(),
      imported: 0,
      skipped: 0,
      errors: 0,
      categories,
      status: 'running'
    };

    this.jobStats.set(jobName, stats);
    this.info('NewsCronJobService', 'startJob', `Started job: ${jobName}`, { categories });
  }

  /**
   * Update job progress
   */
  updateJobProgress(jobName: string, imported: number, skipped: number, errors: number): void {
    const stats = this.jobStats.get(jobName);
    if (stats) {
      stats.imported = imported;
      stats.skipped = skipped;
      stats.errors = errors;
      this.jobStats.set(jobName, stats);
    }
  }

  /**
   * Complete a job successfully
   */
  completeJob(jobName: string, result: { imported: number; skipped: number; errors: number }): void {
    const stats = this.jobStats.get(jobName);
    if (stats) {
      stats.endTime = Date.now();
      stats.duration = stats.endTime - stats.startTime;
      stats.imported = result.imported;
      stats.skipped = result.skipped;
      stats.errors = result.errors;
      stats.status = 'completed';
      
      this.jobStats.set(jobName, stats);
      
      this.info('NewsCronJobService', 'completeJob', `Completed job: ${jobName}`, {
        duration: stats.duration,
        result
      });
    }
  }

  /**
   * Mark job as failed
   */
  failJob(jobName: string, error: any): void {
    const stats = this.jobStats.get(jobName);
    if (stats) {
      stats.endTime = Date.now();
      stats.duration = stats.endTime - stats.startTime;
      stats.status = 'failed';
      
      this.jobStats.set(jobName, stats);
      
      this.error('NewsCronJobService', 'failJob', `Failed job: ${jobName}`, error, {
        duration: stats.duration
      });
    }
  }

  /**
   * Log article processing
   */
  logArticleProcessed(title: string, action: 'created' | 'skipped' | 'error', reason?: string, error?: any): void {
    const operation = 'processArticle';
    
    switch (action) {
      case 'created':
        this.info('GoogleNewsFeedService', operation, `Created article: ${title}`);
        break;
      case 'skipped':
        this.info('GoogleNewsFeedService', operation, `Skipped article: ${title}`, { reason });
        break;
      case 'error':
        this.error('GoogleNewsFeedService', operation, `Error processing article: ${title}`, error, { reason });
        break;
    }
  }

  /**
   * Log feed fetch operation
   */
  logFeedFetch(category: string, itemCount: number, success: boolean, error?: any): void {
    if (success) {
      this.info('GoogleNewsFeedService', 'fetchFeed', `Fetched ${itemCount} items from ${category} feed`);
    } else {
      this.error('GoogleNewsFeedService', 'fetchFeed', `Failed to fetch ${category} feed`, error);
    }
  }

  /**
   * Get recent logs
   */
  getRecentLogs(limit: number = 100, level?: LogEntry['level']): LogEntry[] {
    let filteredLogs = this.logs;
    
    if (level) {
      filteredLogs = this.logs.filter(log => log.level === level);
    }
    
    return filteredLogs.slice(-limit);
  }

  /**
   * Get job statistics
   */
  getJobStats(jobName?: string): JobStats[] | JobStats | null {
    if (jobName) {
      return this.jobStats.get(jobName) || null;
    }
    
    return Array.from(this.jobStats.values());
  }

  /**
   * Get error summary
   */
  getErrorSummary(hours: number = 24): {
    totalErrors: number;
    errorsByService: Record<string, number>;
    recentErrors: LogEntry[];
  } {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recentErrors = this.logs.filter(
      log => log.level === 'error' && new Date(log.timestamp) > cutoffTime
    );

    const errorsByService = recentErrors.reduce((acc, log) => {
      acc[log.service] = (acc[log.service] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalErrors: recentErrors.length,
      errorsByService,
      recentErrors: recentErrors.slice(-10) // Last 10 errors
    };
  }

  /**
   * Clear old logs
   */
  clearOldLogs(olderThanHours: number = 168): void { // Default: 7 days
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    this.logs = this.logs.filter(log => new Date(log.timestamp) > cutoffTime);
    
    this.info('NewsFeedLogger', 'clearOldLogs', `Cleared logs older than ${olderThanHours} hours`);
  }

  /**
   * Export logs for analysis
   */
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['timestamp', 'level', 'service', 'operation', 'message'];
      const csvRows = [headers.join(',')];
      
      this.logs.forEach(log => {
        const row = [
          log.timestamp,
          log.level,
          log.service,
          log.operation,
          `"${log.message.replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(','));
      });
      
      return csvRows.join('\n');
    }
    
    return JSON.stringify(this.logs, null, 2);
  }
}

export default NewsFeedLogger;