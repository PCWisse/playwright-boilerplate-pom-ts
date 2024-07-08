import { execSync } from 'child_process';

export default class GitHelper {
  static execCommand(command: string): string {
    let stdout: string | Buffer = '';

    try {
      stdout = execSync(command);
    } catch (error) {
      return '';
    }

    return String(stdout).trim();
  }

  static inGitRepo(): boolean {
    const checkCmd = 'git rev-parse --is-inside-work-tree 2>/dev/null';
    const stdout = GitHelper.execCommand(checkCmd);

    return stdout === 'true';
  }

  static getBranch(): string {
    const branchCmd = 'git branch --show-current';
    const stdout = GitHelper.execCommand(branchCmd);
    return stdout;
  }
}
