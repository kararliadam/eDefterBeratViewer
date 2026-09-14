(async function () {
    const stored = await chrome.storage.local.get(['printHtml', 'printFileName']);
    const title = (stored.printFileName || 'belge').replace(/\.pdf$/i, '');
    let html = stored.printHtml || '';
    if (!/<title>/i.test(html)) {
        html = html.replace(/<head[^>]*>/i, `$&<title>${title}</title>`);
    }
    if (!html.includes('@page')) {
        html = html.replace(/<head[^>]*>/i, '$&<style>@page { size: A4 portrait; margin: 10mm; }</style>');
    }
    location.replace(URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' })));
})();
