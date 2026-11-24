"""Reads a Desai Foundation Avni bundle zip (App Designer export) and writes data/bundle.json for the demo.
Locations are the demo villages below. Run: python3 tools/make_bundle.py path/to/bundle.zip"""
import json, os, sys, zipfile
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if len(sys.argv) < 2: sys.exit('usage: python3 tools/make_bundle.py path/to/bundle.zip')
ZIP = sys.argv[1]
z = zipfile.ZipFile(ZIP)
rd = lambda n: json.loads(z.read(n))
keep = ['concepts', 'subjectTypes', 'encounterTypes', 'formMappings', 'reportCard', 'reportDashboard', 'groupDashboards', 'groups', 'groupPrivilege', 'groupRole', 'attendanceTypes', 'calendars', 'addressLevelTypes']
b = {k: rd(k + '.json') for k in keep}
b['forms'] = [rd(n) for n in z.namelist() if n.startswith('forms/') and n.endswith('.json')]
b['translations'] = rd('translations/en.json')
# only what the phone uses from each privilege row keeps the page small
b['groupPrivilege'] = [{k: p.get(k) for k in ('groupUUID', 'privilegeType', 'subjectTypeUUID', 'encounterTypeUUID', 'allow', 'voided')} for p in b['groupPrivilege'] if p.get('allow') and not p.get('voided')]
# State > Executive Zone > District > Block > Village (demo villages)
V = [('South Gujarat', 'Navsari', 'Chikhali', ['Agasi', 'Kharoli', 'Chitali', 'Achhavani', 'Alipor', 'Amadhara', 'Ambach', 'Bahej']),
     ('South Gujarat', 'Navsari', 'Vansda', ['Rupvel', 'Kevdi', 'Lachhakadi', 'Mahuvas', 'Sara']),
     ('South Gujarat', 'Dang', 'Ahwa', ['Borkhal', 'Gadhvi', 'Gaykhas', 'Galkund', 'Ghoghli']),
     ('Central Gujarat', 'Bharuch', 'Ankleshvar', ['Piraman', 'Sajod', 'Pungam', 'Boidara', 'Andada'])]
locs, seen = [], {}
def node(name, typ, level, parent):
    key = (parent, name)
    if key not in seen:
        seen[key] = 'L' + str(len(locs) + 1); locs.append({'uuid': seen[key], 'name': name, 'type': typ, 'level': level, 'parent': parent})
    return seen[key]
st = node('Gujarat', 'State', 5, None)
for zone, dist, block, vs in V:
    zz = node(zone, 'Executive Zone', 4, st); dd = node(dist, 'District', 3, zz); bb = node(block, 'Block', 2, dd)
    for v in vs: node(v, 'Village', 1, bb)
out = {'bundle': b, 'locations': locs, 'source': os.path.basename(ZIP)}
json.dump(out, open(os.path.join(ROOT, 'data', 'bundle.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
print('forms', len(b['forms']), 'concepts', len(b['concepts']), 'cards', len(b['reportCard']), 'villages', sum(1 for l in locs if l['type'] == 'Village'),
      'size', os.path.getsize(os.path.join(ROOT, 'data', 'bundle.json')))
