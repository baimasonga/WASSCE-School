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
print('PASS: all offline lab HTML resources bundled; no cloud config, CDN or internet permission.')
