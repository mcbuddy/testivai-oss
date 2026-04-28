import { spawn, ChildProcess } from 'child_process';
import { logger } from './logger';

export interface ProcessOptions {
  cwd?: string;
  env?: Record<string, string>;
  silent?: boolean;
  inheritStdio?: boolean;
}

export interface ProcessResult {
  exitCode: number | null;
  signal: string | null;
  stdout: string;
  stderr: string;
}

/**
 * Spawn a child process and capture its output
 */
export function spawnProcess(
  command: string,
  args: string[] = [],
  options: ProcessOptions = {}
): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env },
      stdio: options.inheritStdio ? 'inherit' : 'pipe',
      shell: true,
    });

    let stdout = '';
    let stderr = '';

    if (!options.inheritStdio && !options.silent) {
      child.stdout?.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        process.stdout.write(chunk);
      });

      child.stderr?.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        process.stderr.write(chunk);
      });
    } else if (options.silent) {
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
    }

    child.on('close', (code, signal) => {
      resolve({
        exitCode: code,
        signal,
        stdout,
        stderr,
      });
    });

    child.on('error', (error) => {
      logger.error(`Failed to spawn process: ${error.message}`);
      reject(error);
    });
  });
}

/**
 * Spawn a process with real-time output and signal handling
 */
export class ProcessManager {
  private child: ChildProcess | null = null;
  private isKilled = false;

  constructor(
    private command: string,
    private args: string[] = [],
    private options: ProcessOptions = {}
  ) {}

  /**
   * Start the process
   */
  async start(): Promise<void> {
    if (this.child) {
      throw new Error('Process already started');
    }

    logger.verbose(`Spawning: ${this.command} ${this.args.join(' ')}`);

    this.child = spawn(this.command, this.args, {
      cwd: this.options.cwd || process.cwd(),
      env: { ...process.env, ...this.options.env },
      stdio: this.options.inheritStdio ? 'inherit' : 'pipe',
      shell: true,
    });

    // Handle process exit
    this.child.on('close', (code, signal) => {
      if (!this.isKilled) {
        if (signal) {
          logger.warn(`Process terminated by signal: ${signal}`);
        } else if (code !== null) {
          if (code === 0) {
            logger.verbose(`Process exited successfully`);
          } else {
            logger.verbose(`Process exited with code: ${code}`);
          }
        }
      }
    });

    // Handle process errors
    this.child.on('error', (error) => {
      logger.error(`Process error: ${error.message}`);
    });

    // Pipe output if not inheriting
    if (!this.options.inheritStdio && !this.options.silent) {
      if (this.child?.stdout) this.child.stdout.pipe(process.stdout);
      if (this.child?.stderr) this.child.stderr.pipe(process.stderr);
    }
  }

  /**
   * Wait for the process to complete
   */
  async wait(): Promise<ProcessResult> {
    if (!this.child) {
      throw new Error('Process not started');
    }

    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      if (this.options.silent && this.child) {
        if (this.child.stdout) {
          this.child.stdout.on('data', (data) => {
            stdout += data.toString();
          });
        }

        if (this.child.stderr) {
          this.child.stderr.on('data', (data) => {
            stderr += data.toString();
          });
        }
      }

      if (this.child) {
        this.child.once('close', (code, signal) => {
          resolve({
            exitCode: code,
            signal,
            stdout,
            stderr,
          });
        });

        this.child.once('error', reject);
      }
    });
  }

  /**
   * Kill the process
   */
  kill(signal: NodeJS.Signals = 'SIGTERM'): void {
    if (this.child && !this.child.killed) {
      this.isKilled = true;
      logger.verbose(`Killing process with signal: ${signal}`);
      this.child.kill(signal);
    }
  }

  /**
   * Check if process is running
   */
  isRunning(): boolean {
    return this.child !== null && !this.child.killed;
  }

  /**
   * Get the child process instance
   */
  getProcess(): ChildProcess | null {
    return this.child;
  }

  /**
   * Run a command and return the result
   */
  static async run(
    command: string,
    args: string[] = [],
    options: ProcessOptions = {}
  ): Promise<ProcessResult> {
    const manager = new ProcessManager(command, args, options);
    await manager.start();
    return manager.wait();
  }
}

/**
 * Handle SIGINT and SIGTERM gracefully
 */
export function setupSignalHandlers(
  cleanup: () => void | Promise<void>
): void {
  const handleSignal = async (signal: NodeJS.Signals) => {
    logger.warn(`Received ${signal}, cleaning up...`);
    try {
      await cleanup();
      process.exit(130); // Standard exit code for SIGINT
    } catch (error) {
      logger.error('Error during cleanup:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => handleSignal('SIGINT'));
  process.on('SIGTERM', () => handleSignal('SIGTERM'));
}

/**
 * Check if a command exists in PATH
 */
export async function commandExists(command: string): Promise<boolean> {
  const isWindows = process.platform === 'win32';
  const checkCommand = isWindows ? 'where' : 'which';

  try {
    await ProcessManager.run(checkCommand, [command], { silent: true });
    return true;
  } catch {
    return false;
  }
}
