/* Chromium yazdırma motoruyla önizleme açmadan PDF kaydı. */
(function () {
    function pageStyle(doc) {
        if (doc.querySelector('style[data-print-page]')) {
            return;
        }
        const style = doc.createElement('style');
        style.setAttribute('data-print-page', 'true');
        style.textContent = '@page { size: A4 portrait; margin: 10mm; }';
        doc.head.appendChild(style);
    }

    function previewHtml() {
        const preview = document.getElementById('htmlPreview');
        const doc = preview && preview.contentDocument;
        if (!doc || !doc.body || !doc.body.innerHTML.trim()) {
            return '';
        }
        pageStyle(doc);
        return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
    }

    function wrapHtml(html) {
        if (!html) {
            return '';
        }
        if (/<html[\s>]/i.test(html)) {
            return html;
        }
        return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>@page { size: A4 portrait; margin: 10mm; }</style></head><body>${html}</body></html>`;
    }

    function printFallback(html, pdfName) {
        const frame = document.createElement('iframe');
        frame.style.position = 'fixed';
        frame.style.width = '0';
        frame.style.height = '0';
        frame.style.border = '0';
        document.body.appendChild(frame);
        return new Promise((resolve, reject) => {
            frame.onload = () => {
                const doc = frame.contentDocument;
                doc.title = pdfName.replace(/\.pdf$/i, '');
                pageStyle(doc);
                frame.contentWindow.focus();
                frame.contentWindow.print();
                resolve();
            };
            frame.onerror = () => reject(new Error('PDF kaydedilemedi.'));
            frame.src = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
        });
    }

    function downloadPdfData(base64, pdfName) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) {
            bytes[index] = binary.charCodeAt(index);
        }
        const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = pdfName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    window.downloadHtmlAsPdf = async function (htmlContent, originalFileName) {
        const pdfName = originalFileName.replace(/\.[^.]+$/i, '.pdf');
        const html = previewHtml() || wrapHtml(htmlContent);
        if (!html) {
            throw new Error('Yazdırılacak önizleme bulunamadı.');
        }

        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            const response = await chrome.runtime.sendMessage({
                type: 'savePreviewPdf',
                html,
                fileName: pdfName
            });
            if (!response || !response.ok || !response.data) {
                throw new Error((response && response.error) || 'PDF kaydedilemedi.');
            }
            downloadPdfData(response.data, pdfName);
            return;
        }

        await printFallback(html, pdfName);
    };
})();
