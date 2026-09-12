/* Direct client-side PDF export without opening a print window. */
(function () {
    let libraryPromise = null;

    function loadScript(src, isReady) {
        return new Promise((resolve, reject) => {
            if (isReady()) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = new URL(src, window.location.href).href;
            script.onload = () => isReady()
                ? resolve()
                : reject(new Error('PDF kütüphanesi başlatılamadı.'));
            script.onerror = () => reject(new Error('PDF kütüphanesi yüklenemedi.'));
            document.head.appendChild(script);
        });
    }

    function loadPdfLibrary() {
        if (libraryPromise) {
            return libraryPromise;
        }

        // Use the two primitives directly. html2pdf's worker occasionally
        // produced an empty page inside extension documents even though the
        // same canvas rendered correctly; direct jsPDF output avoids that
        // opaque worker/pagination path.
        libraryPromise = loadScript(
            'vendor/html2canvas.min.js',
            () => typeof window.html2canvas === 'function'
        ).then(() => loadScript(
            'vendor/jspdf.umd.min.js',
            () => Boolean(window.jspdf && typeof window.jspdf.jsPDF === 'function')
        ));

        return libraryPromise;
    }

    function createPdfSource(htmlContent) {
        const source = document.createElement('div');
        source.setAttribute('data-pdf-export', 'true');
        source.innerHTML = `
            <style>
                * { font-family: 'Open Sans', 'DejaVu Sans', Arial, sans-serif !important; }
                html, body { margin: 0; padding: 0; background: #fff; }
                @page { size: A4; margin: 10mm 5mm; }
            </style>
            ${htmlContent}`;
        // Keep the source in normal document flow so html2canvas measures its
        // height correctly, while translating it outside the viewport. The
        // clone is moved back to the origin during capture below.
        source.style.position = 'static';
        source.style.width = '794px';
        source.style.transform = 'translateX(-10000px)';
        source.style.background = '#fff';
        source.style.color = '#000';
        document.body.appendChild(source);
        return source;
    }

    window.downloadHtmlAsPdf = async function (htmlContent, originalFileName) {
        await loadPdfLibrary();
        if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
        }

        const source = createPdfSource(htmlContent);
        const pdfName = originalFileName.replace(/\.[^.]+$/i, '.pdf');
        try {
            const canvas = await window.html2canvas(source, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                onclone: (clonedDocument) => {
                    const clonedSource = clonedDocument.querySelector('[data-pdf-export]');
                    if (!clonedSource) {
                        return;
                    }
                    // Keep the live source off-screen, but render the clone at
                    // the origin so its measured canvas has a real height.
                    clonedSource.style.position = 'static';
                    clonedSource.style.transform = 'none';
                    clonedSource.style.width = '794px';
                }
            });

            if (!canvas.width || !canvas.height) {
                throw new Error('PDF için içerik kanvası oluşturulamadı.');
            }

            const pdf = new window.jspdf.jsPDF({
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait',
                compress: true
            });
            const imageData = canvas.toDataURL('image/jpeg', 0.98);
            const pageWidth = 190;
            const pageHeight = 277;
            const imageHeight = canvas.height * pageWidth / canvas.width;
            let offset = 0;
            let pageNumber = 0;

            while (offset < imageHeight) {
                if (pageNumber > 0) {
                    pdf.addPage();
                }
                pdf.addImage(imageData, 'JPEG', 5, 10 - offset, pageWidth, imageHeight, undefined, 'FAST');
                offset += pageHeight;
                pageNumber += 1;
            }

            const blob = pdf.output('blob');
            if (!blob || blob.size < 5000) {
                throw new Error('PDF boş oluşturuldu. Lütfen tekrar deneyin.');
            }

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = pdfName;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } finally {
            source.remove();
        }
    };
})();
