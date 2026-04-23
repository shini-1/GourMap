import AsyncStorage from '@react-native-async-storage/async-storage';

interface CrashLog {
  timestamp: string;
  error: string;
  stack?: string;
  component?: string;
  screen?: string;
  userId?: string;
  deviceInfo?: {
    platform: string;
    version: string;
    appVersion: string;
  };
  additionalContext?: any;
}

class CrashLogger {
  private static instance: CrashLogger;
  private logs: CrashLog[] = [];
  private maxLogs = 50; // Keep only last 50 logs
  private storageKey = '@gourmap_crash_logs';

  static getInstance(): CrashLogger {
    if (!CrashLogger.instance) {
      CrashLogger.instance = new CrashLogger();
    }
    return CrashLogger.instance;
  }

  async initialize(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.storageKey);
      if (stored) {
        this.logs = JSON.parse(stored);
        console.log('📋 CrashLogger: Loaded', this.logs.length, 'previous crash logs');
      }
    } catch (error) {
      console.error('❌ CrashLogger: Failed to load stored logs:', error);
    }
  }

  async logError(error: Error | string, context?: {
    component?: string;
    screen?: string;
    userId?: string;
    additionalContext?: any;
  }): Promise<void> {
    const crashLog: CrashLog = {
      timestamp: new Date().toISOString(),
      error: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'string' ? undefined : error.stack,
      component: context?.component,
      screen: context?.screen || 'HomeScreen',
      userId: context?.userId,
      deviceInfo: {
        platform: 'unknown', // Will be populated by device info if available
        version: 'unknown',
        appVersion: '1.0.0' // Should match your app version
      },
      additionalContext: context?.additionalContext
    };

    this.logs.unshift(crashLog);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    try {
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(this.logs));
      console.error('💥 CrashLogger: Logged error:', crashLog);
    } catch (storageError) {
      console.error('❌ CrashLogger: Failed to save log:', storageError);
    }

    // Also log to console for immediate debugging
    console.error('💥 CRASH LOG:', JSON.stringify(crashLog, null, 2));
  }

  async getLogs(): Promise<CrashLog[]> {
    return [...this.logs];
  }

  async clearLogs(): Promise<void> {
    this.logs = [];
    try {
      await AsyncStorage.removeItem(this.storageKey);
      console.log('🗑️ CrashLogger: Cleared all logs');
    } catch (error) {
      console.error('❌ CrashLogger: Failed to clear logs:', error);
    }
  }

  async getRecentErrors(count: number = 10): Promise<CrashLog[]> {
    return this.logs.slice(0, count);
  }

  // Get error summary for debugging
  getErrorSummary(): string {
    if (this.logs.length === 0) return 'No crash logs available';
    
    const recentErrors = this.logs.slice(0, 5);
    return recentErrors.map((log, index) => 
      `${index + 1}. ${log.timestamp} - ${log.error} (${log.component || 'Unknown'})`
    ).join('\n');
  }

  // Log component lifecycle events
  logComponentEvent(component: string, event: string, data?: any): void {
    console.log(`🔄 Component Lifecycle: ${component} - ${event}`, data || '');
  }

  // Log performance metrics
  logPerformance(component: string, metric: string, value: number): void {
    console.log(`⏱️ Performance: ${component} - ${metric}: ${value}ms`);
  }
}

export const crashLogger = CrashLogger.getInstance();
