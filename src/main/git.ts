import { execFile } from 'child_process'
import type { GitStatus } from '@shared/types'

function git(cwd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd, maxBuffer: 32 * 1024 * 1024, windowsHide: true }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr.trim() || err.message))
      else resolve(stdout)
    })
  })
}

export async function gitStatus(cwd: string): Promise<GitStatus> {
  try {
    const out = await git(cwd, ['status', '--porcelain=v1', '-b', '-uall'])
    const lines = out.split(/\r?\n/).filter(Boolean)
    let branch: string | undefined
    const files: GitStatus['files'] = []
    for (const line of lines) {
      if (line.startsWith('## ')) {
        branch = line.slice(3).split('...')[0].replace(/^No commits yet on /, '')
        continue
      }
      const status = line.slice(0, 2)
      let path = line.slice(3)
      if (path.includes(' -> ')) path = path.split(' -> ')[1]
      files.push({ path: path.replace(/^"|"$/g, ''), status: status.trim() || status })
    }
    return { isRepo: true, branch, files }
  } catch {
    return { isRepo: false, files: [] }
  }
}

/** Contents of a file at HEAD, or '' when it's new. */
export async function gitShowHead(cwd: string, relPath: string): Promise<string> {
  try {
    return await git(cwd, ['show', `HEAD:${relPath.replace(/\\/g, '/')}`])
  } catch {
    return ''
  }
}

export async function gitCommitAll(cwd: string, message: string): Promise<string> {
  await git(cwd, ['add', '-A'])
  return git(cwd, ['commit', '-m', message])
}

export async function gitInit(cwd: string): Promise<void> {
  await git(cwd, ['init'])
}
