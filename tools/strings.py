"""Lists every English guide sentence (lessons via the page, guide text via L('...') in guide.js) into data/strings.json.
Run after build: python3 tools/strings.py"""
import json, os, re, subprocess, html
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
chrome = os.environ.get('CHROME', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
url = 'file://' + os.path.join(root, 'dist', 'index.html').replace(' ', '%20') + '?strings=1'
dom = subprocess.run([chrome, '--headless=new', '--disable-gpu', '--virtual-time-budget=6000', '--dump-dom', url], capture_output=True, text=True).stdout
runtime = json.loads(html.unescape(re.search(r'<pre id="strings">(.*?)</pre>', dom, re.S).group(1)))
src = open(os.path.join(root, 'src', 'guide.js'), encoding='utf-8').read()
static = [m.group(2).replace("\\'", "'") for m in re.finditer(r"L\((['\"])((?:\\.|(?!\1).)*)\1", src)]
q = r"'((?:\\.|[^'])*)'"
static += [x for m in re.finditer(r"node\('[^']*', '[^']*', " + q + ", " + q + r"\)", src) for x in m.groups()]
static += [x for m in re.finditer(r"\['[^']*', " + q + ", " + q + r"\]", src) for x in m.groups() if ' ' in x or len(x) > 3]
static = [x.replace("\\'", "'") for x in static]
allx = list(dict.fromkeys(runtime + static))
json.dump(allx, open(os.path.join(root, 'data', 'strings.json'), 'w'), ensure_ascii=False, indent=1)
old = json.load(open(os.path.join(root, 'data', 'i18n.json'))) if os.path.exists(os.path.join(root, 'data', 'i18n.json')) else {}
print('strings', len(allx), '| missing hi', sum(1 for x in allx if 'hi' not in old.get(x, {})), '| missing gu', sum(1 for x in allx if 'gu' not in old.get(x, {})))
