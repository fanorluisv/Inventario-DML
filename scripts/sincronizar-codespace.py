#!/usr/bin/env python3
"""Descarga respaldos completos del Codespace sin sobrescribir el trabajo local."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tarfile
import tempfile
import time
import fcntl
import importlib.util
_spec = importlib.util.spec_from_file_location('respaldo_proyecto', Path(__file__).with_name('respaldo-proyecto.py'))
_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_module)
record = _module.record

# The source file uses a hyphen; import it without requiring a package install.

def gh_binary(root):
    if shutil.which('gh'):
        return shutil.which('gh')
    candidates = list((root / '.tools/github-cli/current').glob('*/bin/gh'))
    if candidates:
        return str(candidates[0])
    raise RuntimeError('Instala GitHub CLI y ejecuta gh auth login con acceso codespace.')

def run(command, **kwargs):
    return subprocess.run(command, capture_output=True, text=True, timeout=240, check=True, **kwargs).stdout.strip()

def sync(root, codespace):
    gh = gh_binary(root)
    spaces = json.loads(run([gh, 'codespace', 'list', '--json', 'name,state,repository']))
    selected = next((space for space in spaces if space['name'] == codespace), None)
    if not selected:
        raise RuntimeError('No se encontró el Codespace configurado. Indica --codespace con su nombre actual.')
    if selected['state'] != 'Available':
        print(f'Codespace {selected["state"]}: no se inicia automáticamente; se conserva la última réplica.', flush=True)
        return False
    remote_root = '/workspaces/Inventario-DML'
    source = (root / 'scripts/respaldo-proyecto.py').read_text()
    result = run([gh, 'codespace', 'ssh', '-c', codespace, '--', '-T',
                  f'python3 - --root {remote_root} --docker'], input=source)
    paths = [line for line in result.splitlines() if line.startswith(remote_root + '/backups/completos/') and line.endswith('.tar.gz')]
    if len(paths) != 1:
        raise RuntimeError('No se pudo identificar el respaldo remoto; no se modificó la réplica.')
    remote = paths[0]
    archives = root / 'backups/completos/codespace'
    archives.mkdir(parents=True, exist_ok=True, mode=0o700)
    with tempfile.TemporaryDirectory(prefix='.descarga-', dir=archives) as temporary:
        destination = Path(temporary)
        run([gh, 'codespace', 'cp', '-c', codespace, 'remote:' + remote,
             'remote:' + remote + '.sha256', 'remote:' + remote + '.json', str(destination)])
        archive = destination / Path(remote).name
        expected = json.loads(archive.with_suffix(archive.suffix + '.json').read_text())
        with archive.open('rb') as stream:
            actual = hashlib.file_digest(stream, 'sha256').hexdigest()
        if actual != expected['sha256']:
            raise RuntimeError('SHA256 incorrecto: se rechazó la copia descargada.')
        replica = root / 'replica-codespace'
        replica.mkdir(exist_ok=True, mode=0o700)
        stage = replica / archive.name.removesuffix('.tar.gz')
        stage.mkdir(mode=0o700)
        try:
            with tarfile.open(archive) as bundle:
                bundle.extractall(stage, filter='data')
        except Exception:
            shutil.rmtree(stage)
            raise
        for file in destination.iterdir():
            file.replace(archives / file.name)
        pointer = replica / '.latest-new'
        pointer.unlink(missing_ok=True)
        pointer.symlink_to(stage.name, target_is_directory=True)
        pointer.replace(replica / 'latest')
        record(root, f'Réplica descargada desde {codespace}: {archive.name}; commit {expected["commit"][:7]}; SHA256 verificado; código, configuración privada y base. Carpeta: replica-codespace/latest/proyecto.')
        if expected['cambios_sin_commit']:
            record(root, 'Archivos remotos con cambios sin publicar:\n' + '\n'.join('  - ' + line for line in expected['cambios_sin_commit'].splitlines()))
        print(f'Respaldo: {archives / archive.name}\nRéplica lista: {replica / "latest/proyecto"}', flush=True)
        return True

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--codespace', default='legendary-lamp-4qv6qxjp9rwgc6p5')
    parser.add_argument('--watch', action='store_true')
    parser.add_argument('--intervalo', type=int, default=900, help='Segundos entre copias (mínimo 60).')
    args = parser.parse_args()
    if args.intervalo < 60:
        parser.error('El intervalo mínimo es 60 segundos.')
    os.umask(0o077)
    root = Path(__file__).resolve().parents[1]
    runtime = root / '.runtime'; runtime.mkdir(exist_ok=True, mode=0o700)
    with (runtime / 'replica-local.lock').open('w') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise SystemExit('La réplica local ya está activa.')
        while True:
            try:
                sync(root, args.codespace)
            except Exception as error:
                print(f'No se actualizó la réplica: {type(error).__name__}: {error}', flush=True)
                if not args.watch:
                    raise SystemExit(1)
            if not args.watch:
                break
            time.sleep(args.intervalo)
