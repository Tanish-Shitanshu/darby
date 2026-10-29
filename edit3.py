p = 'apps/server/src/executor/code-tools.ts'
s = open(p, encoding='utf8').read()
old = "FAILING TEST OUTPUT:\n${prev.output ?? ''}"
assert old in s
s = s.replace(old, "FAILING TEST OUTPUT:\n${tidyOutput(prev.output ?? '')}")
fn = r'''
/** What the coder sees of a test run: the failing assertions only, with machine paths, timings and runner internals removed (stable and short). */
export function tidyOutput(out: string): string {
  return out.split('\n')
    .filter((l) => !/duration_ms|^\s*location:|^\s*stack:|node:internal|^\s+(Test|async|TestContext|Suite|process)\b|^\s*(type|failureType|code|name|operator):|^\s*(---|\.\.\.)\s*$|^# (suites|cancelled|skipped|todo|duration)/.test(l))
    .map((l) => l.replace(/[A-Za-z]:[\/][^'"\s]*?[\/]code[\/]/g, '').replace(/\/[^'"\s]*?\/code\//g, ''))
    .join('\n').replace(/\n{3,}/g, '\n\n').slice(0, 3000);
}
'''
s = s.replace("const Fix = z.object(", fn + "\nconst Fix = z.object(", 1)
open(p, 'w', encoding='utf8', newline='\n').write(s)
