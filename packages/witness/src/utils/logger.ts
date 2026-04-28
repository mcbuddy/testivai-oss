import chalk from 'chalk';

export interface LoggerOptions {
  verbose?: boolean;
  quiet?: boolean;
  debug?: boolean;
}

export class Logger {
  private options: LoggerOptions;

  constructor(options: LoggerOptions = {}) {
    this.options = options;
  }

  private shouldLog(level: 'error' | 'warn' | 'info' | 'debug' | 'success'): boolean {
    if (this.options.quiet && level !== 'error') return false;
    if (level === 'debug' && !this.options.debug) return false;
    return true;
  }

  error(message: string, ...args: any[]): void {
    if (!this.shouldLog('error')) return;
    console.error(chalk.red(`❌ ${message}`), ...args);
  }

  warn(message: string, ...args: any[]): void {
    if (!this.shouldLog('warn')) return;
    console.warn(chalk.yellow(`⚠️  ${message}`), ...args);
  }

  info(message: string, ...args: any[]): void {
    if (!this.shouldLog('info')) return;
    console.log(chalk.blue(`ℹ️  ${message}`), ...args);
  }

  debug(message: string, ...args: any[]): void {
    if (!this.shouldLog('debug')) return;
    console.log(chalk.gray(`🐛 ${message}`), ...args);
  }

  success(message: string, ...args: any[]): void {
    if (!this.shouldLog('success')) return;
    console.log(chalk.green(`✅ ${message}`), ...args);
  }

  verbose(message: string, ...args: any[]): void {
    if (!this.options.verbose || this.options.quiet) return;
    console.log(chalk.gray(`   ${message}`), ...args);
  }

  plain(message: string, ...args: any[]): void {
    if (this.options.quiet) return;
    console.log(message, ...args);
  }

  // Specialized loggers for common operations
  capture(snapshotName: string): void {
    if (!this.shouldLog('info')) return;
    console.log(chalk.cyan(`📸 Capturing: ${snapshotName}`));
  }

  upload(batchId: string): void {
    if (!this.shouldLog('info')) return;
    console.log(chalk.cyan(`📤 Uploading batch: ${batchId}`));
  }

  connected(port: number): void {
    if (!this.shouldLog('success')) return;
    console.log(chalk.green(`🔗 Connected to Chrome on port ${port}`));
  }

  disconnected(): void {
    if (!this.shouldLog('info')) return;
    console.log(chalk.blue(`🔌 Disconnected from Chrome`));
  }

  bindingRegistered(bindingName: string): void {
    if (!this.shouldLog('debug')) return;
    console.log(chalk.gray(`📝 Registered binding: ${bindingName}`));
  }

  bindingCalled(bindingName: string, payload?: string): void {
    if (!this.shouldLog('debug')) return;
    console.log(chalk.gray(`📞 Binding called: ${bindingName}${payload ? ` (${payload})` : ''}`));
  }

  // Progress indicators
  startProgress(message: string): void {
    if (!this.shouldLog('info')) return;
    process.stdout.write(`${chalk.blue('⏳')} ${message}...`);
  }

  updateProgress(message: string): void {
    if (!this.shouldLog('info')) return;
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(`${chalk.blue('⏳')} ${message}...`);
  }

  endProgress(message: string): void {
    if (!this.shouldLog('info')) return;
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    console.log(`${chalk.green('✓')} ${message}`);
  }
}

// Create default logger instance
export const logger = new Logger();

// Create logger with options
export function createLogger(options: LoggerOptions): Logger {
  return new Logger(options);
}
