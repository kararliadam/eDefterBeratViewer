(function () {
    const tauri = window.__TAURI__;
    if (!tauri || !tauri.core || typeof tauri.core.invoke !== 'function') {
        return;
    }

    document.body.classList.add('workspace-page');
    document.title = 'eDefter Berat Görüntüleyici';

    async function fileFromPath(path) {
        const result = await tauri.core.invoke('read_launch_file', { path });
        const bytes = result.data instanceof Uint8Array
            ? result.data
            : new Uint8Array(result.data);
        const type = result.name.toLowerCase().endsWith('.zip')
            ? 'application/zip'
            : 'application/xml';
        return new File([bytes], result.name, { type });
    }

    async function openPath(path) {
        if (!path || typeof window.openDesktopFile !== 'function') {
            return;
        }

        try {
            const file = await fileFromPath(path);
            await window.openDesktopFile(file);
        } catch (error) {
            const message = error && error.message ? error.message : String(error);
            window.alert('Dosya açılamadı: ' + message);
        }
    }

    async function boot() {
        const pendingPath = await tauri.core.invoke('get_pending_file_path');
        if (pendingPath) {
            await openPath(pendingPath);
        }

        if (tauri.event && typeof tauri.event.listen === 'function') {
            await tauri.event.listen('open-file', (event) => {
                openPath(event.payload);
            });
        }
    }

    window.addEventListener('DOMContentLoaded', () => {
        boot();
    });
})();
