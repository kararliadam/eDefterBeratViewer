/*
 * Browser-independent XSLT transformation.
 * Chrome is removing its native XSLTProcessor, so load the local WASM
 * polyfill lazily on the first document transformation.
 */
(function () {
    let polyfillPromise = null;

    function getPolyfillUrl() {
        return new URL('vendor/xslt-polyfill.min.js', document.currentScript?.src || window.location.href).href;
    }

    function installNativeGuard() {
        // The polyfill probes the native constructor. Replacing it before the
        // script loads prevents Chrome from emitting a deprecation warning.
        const polyfillConstructor = function XSLTProcessor() {
            throw new Error('XSLT polyfill henüz hazır değil.');
        };
        try {
            Object.defineProperty(window, 'XSLTProcessor', {
                configurable: true,
                writable: true,
                value: polyfillConstructor
            });
        } catch (error) {
            window.XSLTProcessor = polyfillConstructor;
        }
    }

    function ensureXsltPolyfill() {
        if (polyfillPromise) {
            return polyfillPromise;
        }

        polyfillPromise = new Promise((resolve, reject) => {
            if (typeof window.xsltPolyfillReady === 'function') {
                window.xsltPolyfillReady().then(resolve, reject);
                return;
            }

            installNativeGuard();
            window.xsltUsePolyfillAlways = true;
            window.xsltDontAutoloadXmlDocs = true;

            const script = document.createElement('script');
            script.src = getPolyfillUrl();
            script.onload = () => {
                if (typeof window.xsltPolyfillReady !== 'function') {
                    reject(new Error('XSLT polyfill başlatılamadı.'));
                    return;
                }
                window.xsltPolyfillReady().then(resolve, reject);
            };
            script.onerror = () => reject(new Error('XSLT polyfill yüklenemedi.'));
            document.head.appendChild(script);
        });

        return polyfillPromise;
    }

    window.transformXmlWithXslt = async function (xmlContent, xsltContent) {
        await ensureXsltPolyfill();

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
        // The supplied e-defter stylesheets are authored as XSLT 2.0 but use
        // only XSLT 1.0 instructions. The browser polyfill intentionally
        // implements the browser-compatible 1.0 subset, so strip the unused
        // 2.0 character-map metadata before compiling to avoid libxslt noise.
        const compatibleXslt = xsltContent
            .replace(/(<xsl:stylesheet\b[^>]*\bversion\s*=\s*["'])2\.0(["'])/i, (match, prefix, suffix) => `${prefix}1.0${suffix}`)
            .replace(/<xsl:character-map\b[^>]*>[\s\S]*?<\/xsl:character-map>/gi, '')
            .replace(/\s+use-character-maps\s*=\s*(?:"[^"]*"|'[^']*')/gi, '');
        const xsltDoc = parser.parseFromString(compatibleXslt, 'text/xml');
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
            throw new Error('XML parse hatası: ' + parserError.textContent);
        }
        const xsltError = xsltDoc.querySelector('parsererror');
        if (xsltError) {
            throw new Error('XSLT parse hatası: ' + xsltError.textContent);
        }

        const processor = new window.XSLTProcessor();
        processor.importStylesheet(xsltDoc);
        const resultDoc = processor.transformToDocument(xmlDoc);
        return new XMLSerializer().serializeToString(resultDoc);
    };
})();
