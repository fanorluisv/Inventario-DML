#!/usr/bin/env python3
"""Respaldo privado de código, historial Git, configuración y PostgreSQL."""
import argparse
import datetime as dt
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import tarfile

EXCLUDED = {'node_modules', 'dist', 'backups', '.runtime', '.tools', '.agents', '.codex', '.aws', 'replica-codespace', '__pycache__'}

def now():
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')

def git(root, *args):
    return subprocess.check_output(['git', '-C', str(root), *args], text=True).strip()

def refresh_history(root):
    template = root / 'docs/contexto-proyecto.md'
    history = root / 'backkupcode.md'
    heading = '## Registro automático de respaldo y sincronización'
    if template.exists():
        previous = history.read_text() if history.exists() else ''
        entries = previous.split(heading, 1)[1] if heading in previous else ''
        history.write_text(template.read_text().split(heading, 1)[0] + heading + '\n' + entries)

def record(root, message):
    refresh_history(root)
    with (root / 'backkupcode.md').open('a', encoding='utf-8') as stream:
        stream.write(f'\n- {now()} — {message}\n')

def node_binary():
    if shutil.which('node'):
        return shutil.which('node')
    candidates = list((Path.home() / '.nvm/versions/node').glob('*/bin/node'))
    if candidates:
        return str(max(candidates, key=lambda p: tuple(int(n) for n in p.parts[-3].lstrip('v').split('.'))))
    raise RuntimeError('Instala Node.js 24 para crear el respaldo de PostgreSQL.')

def backup(root, docker=False, code_only=False):
    root = root.resolve()
    refresh_history(root)
    os.umask(0o077)
    target = root / 'backups/completos'
    target.mkdir(parents=True, exist_ok=True, mode=0o700)
    stamp = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    dump = None
    if not code_only:
        command = [node_binary(), str(root / 'backend/backup-operational.js')]
        if docker:
            command.append('--docker')
        result = subprocess.run(command, cwd=root, capture_output=True, text=True, timeout=180, check=True)
        prefix = 'Respaldo creado: '
        paths = [line[len(prefix):] for line in result.stdout.splitlines() if line.startswith(prefix)]
        if not paths:
            raise RuntimeError('El respaldo de base de datos no devolvió una ruta.')
        dump = Path(paths[-1])
        with dump.open('rb') as stream:
            if stream.read(5) != b'PGDMP':
                raise RuntimeError('El archivo no es un respaldo PostgreSQL custom válido.')
    head = git(root, 'rev-parse', 'HEAD')
    status = git(root, 'status', '--short')
    manifest = {'fecha_utc': now(), 'commit': head, 'cambios_sin_commit': status,
                'incluye_base': bool(dump), 'origen': os.environ.get('CODESPACE_NAME', 'codespace' if str(root).startswith('/workspaces/') else 'equipo-local'),
                'configuracion_privada': [name for name in ['.env', 'backend/.env'] if (root / name).exists()]}
    history = root / 'backkupcode.md'
    marker = root / '.runtime/history-head'
    marker.parent.mkdir(exist_ok=True, mode=0o700)
    previous = marker.read_text().strip() if marker.exists() else ''
    if history.exists() and previous != head:
        try:
            commits = git(root, 'log', '--format=%h %s', f'{previous}..HEAD') if previous else git(root, 'log', '-12', '--format=%h %s')
        except subprocess.CalledProcessError:
            commits = git(root, 'log', '-12', '--format=%h %s')
        if commits:
            record(root, 'Commits observados:\n' + '\n'.join(f'  - {line}' for line in commits.splitlines()))
        marker.write_text(head)
    archive = target / f'inventario-completo-{stamp}.tar.gz'
    temporary = archive.with_suffix('.partial')
    def include(info):
        parts = Path(info.name).parts[1:]
        if any(part in EXCLUDED for part in parts) or info.name.endswith(('.log', '.lock', '.tsbuildinfo')):
            return None
        return info
    try:
        with tarfile.open(temporary, 'w:gz', dereference=False) as bundle:
            bundle.add(root, arcname='proyecto', filter=include)
            if dump:
                bundle.add(dump, arcname='base-datos.dump')
            metadata = json.dumps(manifest, ensure_ascii=False, indent=2).encode()
            info = tarfile.TarInfo('manifest.json'); info.size = len(metadata); info.mode = 0o600
            bundle.addfile(info, io.BytesIO(metadata))
        with temporary.open('rb') as stream:
            digest = hashlib.file_digest(stream, 'sha256').hexdigest()
        temporary.replace(archive)
        checksum = archive.with_suffix(archive.suffix + '.sha256')
        checksum.write_text(f'{digest}  {archive.name}\n')
        manifest.update({'archivo': archive.name, 'sha256': digest})
        archive.with_suffix(archive.suffix + '.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
        for file in [archive, checksum, archive.with_suffix(archive.suffix + '.json')]:
            file.chmod(0o600)
        target.chmod(0o700)
        if history.exists():
            record(root, f'Respaldo {archive.name}; commit {head[:7]}; base de datos: {"sí" if dump else "NO (solo código)"}; SHA256 {digest}.')
        return archive
    except Exception:
        temporary.unlink(missing_ok=True)
        raise

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--docker', action='store_true')
    parser.add_argument('--solo-codigo', action='store_true', help='No incluye la base; no permite recuperación completa.')
    args = parser.parse_args()
    print(backup(args.root, args.docker, args.solo_codigo))
