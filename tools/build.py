"""Assemble the single-file guide: dist/index.html (works offline). Run: python3 tools/build.py"""
import base64, json, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rd = lambda *p: open(os.path.join(root, *p), encoding='utf-8').read()
data = json.loads(rd('data', 'bundle.json'))
icons = {k: 'data:image/png;base64,' + base64.b64encode(open(os.path.join(root, 'data', 'icons', k + '.png'), 'rb').read()).decode() for k in ('person', 'individual', 'group')}
i18n = json.loads(rd('data', 'i18n.json')) if os.path.exists(os.path.join(root, 'data', 'i18n.json')) else {}
desai = {'bundle': data['bundle'], 'locations': data['locations'], 'source': data['source'], 'enh': json.loads(rd('data', 'enhancements.json')), 'icons': icons, 'appI18n': json.loads(rd('data', 'app-i18n.json')) if os.path.exists(os.path.join(root, 'data', 'app-i18n.json')) else {}}
js = [rd('tools', 'vendor', 'rt.js'), 'const DESAI = ' + json.dumps(desai, ensure_ascii=False, separators=(',', ':')) + ';', 'const I18N = ' + json.dumps(i18n, ensure_ascii=False, separators=(',', ':')) + ';']
js += [rd('src', f) for f in ('core.js', 'engine.js', 'applang.js', 'ui.js', 'lessons.js', 'guide.js', 'track.js', 'main.js')]
js = '\n'.join(js).replace('</script', '<\\/script')
html = rd('src', 'index.tpl.html').replace('/*__CSS__*/', rd('src', 'styles.css')).replace('/*__JS__*/', js)
os.makedirs(os.path.join(root, 'dist'), exist_ok=True)
out = os.path.join(root, 'dist', 'index.html')
img = lambda n: 'data:image/png;base64,' + base64.b64encode(open(os.path.join(root, 'data', 'icons', n), 'rb').read()).decode()
html = html.replace('__AVNI_LOGO__', img('avni-logo.png')).replace('__DFT_LOGO__', img('dft-logo.png'))
open(out, 'w', encoding='utf-8').write(html)
print('built', out, os.path.getsize(out), 'bytes')
