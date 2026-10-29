import time

def sub(path, old, new):
    s = open(path, encoding='utf8').read()
    assert old in s, (path, old[:80])
    s = s.replace(old, new, 1)
    for i in range(10):
        try:
            open(path, 'w', encoding='utf8', newline='\n').write(s)
            return
        except OSError:
            time.sleep(1.5)
    raise SystemExit('write failed')

T = 'apps/server/src/executor/tools.ts'
sub(T, """    } catch (e) {
      if (ctx.signal.aborted) throw e;
      throw new ToolError(`The reader model could not be reached: ${(e as Error).message.slice(0, 160)}`, 'needs_you');
    }""", """    } catch (e) {
      if (ctx.signal.aborted) throw e;
      if (p.label) {   // open web: one page the reader model could not answer must not sink the other companies; it becomes a MISSING row
        ctx.emit({ type: 'step.action', runId: ctx.runId, stepId: step.id, description: `${p.label}: the reader model did not answer for this page (${(e as Error).message.slice(0, 80)}). Marked MISSING, nothing guessed.` });
        if (!ctx.gapSlugs.includes(p.label)) ctx.gapSlugs.push(p.label);
        return { unread: true, url: p.url, slug: p.label, record: { name: p.label, priceUsd: null, quote: null, note: 'The page was read but the reader model gave no answer for it.' } };
      }
      throw new ToolError(`The reader model could not be reached: ${(e as Error).message.slice(0, 160)}`, 'needs_you');
    }""")
P = 'apps/server/src/llm/providers.ts'
sub(P, "temperature: 0, messages: [{ role: 'system', content: `${req.system}\\nReply with ONLY one JSON object, no explanation.` }",
       "temperature: 0, max_tokens: 3000, messages: [{ role: 'system', content: `${req.system}\\nReply with ONLY one JSON object, no explanation.` }")
