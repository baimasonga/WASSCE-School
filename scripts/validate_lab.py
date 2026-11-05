"""Verify all offline lab resources ship in the APK source without remote dependencies."""
from pathlib import Path
from html.parser import HTMLParser
r = Path(__file__).resolve().parents[1] / 'app/src/main/assets/chemistry-lab'
class Resources(HTMLParser):
    def handle_starttag(self, tag, attrs):
        for k, value in attrs:
            if k in ('src', 'href') and value and not value.startswith('#'):
                assert not value.startswith(('http:', 'https:', '//')), value
                assert (r / value).is_file(), value
Resources().feed((r / 'index.html').read_text())
assert not any((r/'js'/name).exists() for name in ('cloud.js', 'teacher.js', 'config.js'))
assert 'android.permission.INTERNET' not in (r.parents[1]/'AndroidManifest.xml').read_text()

# Online (website) lab: every remote script must name an exact version and carry Subresource Integrity.
import re
w = Path(__file__).resolve().parents[1] / 'web/public/chemistry-lab'
assert (w / 'teacher.html').is_file(), w
class RemoteScripts(HTMLParser):
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'script' and (a.get('src') or '').startswith(('http:', 'https:', '//')):
            assert re.search(r'@\d+\.\d+\.\d+/', a['src']), 'unpinned script ' + a['src']
            assert (a.get('integrity') or '').startswith('sha384-'), 'script without integrity ' + a['src']
            assert a.get('crossorigin') == 'anonymous', 'integrity needs crossorigin ' + a['src']
for page in w.glob('*.html'):
    RemoteScripts().feed(page.read_text())
for js in (w / 'js').glob('*.js'):
    for url in re.findall(r"https://cdn\.[^'\"\s]+\.js", js.read_text()):
        assert re.search(r'@\d+\.\d+\.\d+/', url), f'unpinned script {url} in {js.name}'
        assert 'integrity' in js.read_text(), f'{js.name} loads {url} without integrity'
print('PASS: all offline lab HTML resources bundled; no cloud config, CDN or internet permission.')
print('PASS: website lab scripts from CDNs are version-pinned with Subresource Integrity.')
