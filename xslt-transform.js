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

    function isDesktopApp() {
        return Boolean(window.__TAURI__) ||
            window.location.protocol === 'tauri:' ||
            window.location.hostname === 'tauri.localhost';
    }

    function hasNativeXslt() {
        return typeof window.XSLTProcessor === 'function' &&
            window.XSLTProcessor.prototype &&
            typeof window.XSLTProcessor.prototype.transformToDocument === 'function';
    }

    function shouldUsePolyfill() {
        return !(isDesktopApp() && hasNativeXslt());
    }

    function isStackOverflow(error) {
        const message = String(error && error.message || error);
        return error instanceof RangeError ||
            /Maximum call stack size exceeded|too much recursion|call stack exhausted/i.test(message);
    }

    function ensureXsltPolyfill() {
        if (!shouldUsePolyfill()) {
            return Promise.resolve();
        }

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

        try {
            return transformDocument(xmlDoc, xsltDoc);
        } catch (error) {
            if (!isStackOverflow(error)) {
                throw error;
            }
            return transformDocumentInChunks(xmlDoc, xsltDoc);
        }
    };

    function transformDocument(xmlDoc, xsltDoc) {
        const processor = new window.XSLTProcessor();
        processor.importStylesheet(xsltDoc);
        const resultDoc = processor.transformToDocument(xmlDoc);
        return serializeDocument(resultDoc);
    }

    function serializeDocument(resultDoc) {
        try {
            return new XMLSerializer().serializeToString(resultDoc);
        } catch (error) {
            if (!isStackOverflow(error)) {
                throw error;
            }
            const root = resultDoc.documentElement || resultDoc;
            return serializeNodeIterative(root);
        }
    }

    function serializeNodeIterative(root) {
        const parts = [];
        const stack = [{ node: root, close: false }];

        while (stack.length > 0) {
            const item = stack.pop();
            const node = item.node;

            if (item.close) {
                parts.push('</' + node.nodeName + '>');
                continue;
            }

            if (node.nodeType === Node.TEXT_NODE) {
                parts.push(escapeXml(node.nodeValue || ''));
                continue;
            }

            if (node.nodeType !== Node.ELEMENT_NODE) {
                continue;
            }

            let open = '<' + node.nodeName;
            const attributes = node.attributes || [];
            for (let index = 0; index < attributes.length; index += 1) {
                const attribute = attributes[index];
                open += ' ' + attribute.name + '="' + escapeXml(attribute.value) + '"';
            }
            open += '>';
            parts.push(open);
            stack.push({ node, close: true });

            const children = [];
            for (let child = node.lastChild; child; child = child.previousSibling) {
                children.push({ node: child, close: false });
            }
            for (let index = 0; index < children.length; index += 1) {
                stack.push(children[index]);
            }
        }

        return parts.join('');
    }

    function escapeXml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function transformDocumentInChunks(xmlDoc, xsltDoc) {
        const headers = Array.from(xmlDoc.getElementsByTagNameNS(
            'http://www.xbrl.org/int/gl/cor/2006-10-25',
            'entryHeader'
        ));
        if (headers.length < 2) {
            throw new Error('Belge dönüşümü tamamlanamadı.');
        }

        const parent = headers[0].parentNode;
        const detached = headers.slice();
        for (let index = 0; index < detached.length; index += 1) {
            parent.removeChild(detached[index]);
        }

        try {
            const chunkSize = 25;
            const bodies = [];
            for (let offset = 0; offset < detached.length; offset += chunkSize) {
                const batch = detached.slice(offset, offset + chunkSize);
                for (let index = 0; index < batch.length; index += 1) {
                    parent.appendChild(batch[index]);
                }
                const html = transformDocument(xmlDoc, xsltDoc);
                const body = extractHtmlBody(html);
                bodies.push(offset === 0 ? body : stripRepeatedChrome(body));
                for (let index = 0; index < batch.length; index += 1) {
                    parent.removeChild(batch[index]);
                }
            }
            return wrapHtmlBodies(bodies);
        } finally {
            for (let index = 0; index < detached.length; index += 1) {
                parent.appendChild(detached[index]);
            }
        }
    }

    function extractHtmlBody(html) {
        const match = String(html).match(/<body\b[^>]*>([\s\S]*)<\/body>/i);
        return match ? match[1] : html;
    }

    function stripRepeatedChrome(bodyHtml) {
        const withoutHeaderTables = bodyHtml.replace(/<table\b[^>]*>[\s\S]*?<\/table>/i, '');
        return withoutHeaderTables;
    }

    function wrapHtmlBodies(bodies) {
        return '<html><body>' + bodies.join('') + '</body></html>';
    }
})();
