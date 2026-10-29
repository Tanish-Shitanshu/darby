def sub(path, old, new):
    s = open(path, encoding='utf8').read()
    assert old in s, (path, old[:60])
    open(path, 'w', encoding='utf8', newline='\n').write(s.replace(old, new, 1))
sub('apps/companion/src/App.tsx', "testid: 'example-code'", "testid: 'example-case6'")
W = 'scripts/ui-walkthrough.mjs'
sub(W, "  console.log('\n▶ controls: deny and cancel');", """  console.log('\n▶ case 6: fix a failing test (coding workflow)');
  await startExample('case6');
  await waitVerdict();
  check('case 6 verdict is VERIFIED (the verifier ran the tests itself)', (await verdictText()).includes('VERIFIED'), await verdictText());
  check('the receipt says the tests were run again by the verifier', /run again by the verifier/.test(await tid('receipt').innerText()));
  await shot('09b-case6-code');

  console.log('\n▶ controls: deny and cancel');""")
sub(W, "  check('three gaps listed', /3 gaps/i.test(await tid('gaps').innerText()));", "  check('three gaps listed', /3 gaps/i.test(await tid('gaps').innerText()));\n  check('the spreadsheet is shown in the app with a download button', (await tid('sheet-preview').count()) === 1 && (await tid('download-sheet').count()) === 1);")
