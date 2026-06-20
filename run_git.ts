import { execSync } from 'child_process';
try {
  const status = execSync('git --git-dir=/.git --work-tree=/ status', { encoding: 'utf8' });
  console.log('GIT STATUS:\n', status);
} catch (err: any) {
  console.error('Error running git status:', err.message, err.stdout, err.stderr);
}
