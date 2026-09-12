/**
 * PDF Viewer - XML dosyasını otomatik olarak PDF görünümüne dönüştürür
 */

// URL parametrelerini al
const urlParams = new URLSearchParams(window.location.search);
const fileName = urlParams.get('file') || 'document.xml';
const fileType = urlParams.get('type') || 'KB';
const sourceUrl = urlParams.get('source'); // Orijinal XML dosyasının URL'i

// XSLT dosya eşleştirmeleri
const xsltMapping = {
    'DR': 'defterraporu.xslt',
    'KB': 'berat.xslt',
    'YB': 'berat.xslt',
    'K': 'kebir.xslt',
    'Y': 'yevmiye.xslt'
};

// DOM Elements
const loader = document.getElementById('loader');
const error = document.getElementById('error');
const errorMessage = document.getElementById('errorMessage');
const previewContainer = document.getElementById('previewContainer');
const previewContent = document.getElementById('previewContent');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
const printBtn = document.getElementById('printBtn');

/**
 * XSLT dosyasını extension'dan yükler
 */
async function loadXsltFile(fileType) {
    const xsltFileName = xsltMapping[fileType];
    if (!xsltFileName) {
        throw new Error(`Geçersiz dosya türü: ${fileType}`);
    }
    
    const xsltUrl = typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getURL === 'function'
        ? chrome.runtime.getURL(`xslt/${xsltFileName}`)
        : `xslt/${xsltFileName}`;
    const response = await fetch(xsltUrl);
    
    if (!response.ok) {
        throw new Error(`XSLT dosyası yüklenemedi: ${xsltFileName}`);
    }
    
    return await response.text();
}

/** XML'i yerel XSLT polyfill'i ile HTML'e dönüştürür. */
async function xmlToHtml(xmlContent, xsltContent) {
    try {
        return await window.transformXmlWithXslt(xmlContent, xsltContent);
    } catch (error) {
        throw error;
    }
}

/**
 * PDF görünümünü oluşturur
 */
async function generatePreview() {
    try {
        let xmlContent = null;
        let detectedFileType = fileType;
        let detectedFileName = fileName;
        
        // Önce storage'dan XML içeriğini al
        const result = await chrome.storage.local.get(['autoConvertXml', 'autoConvertFileType', 'autoConvertFileName']);
        xmlContent = result.autoConvertXml;
        if (result.autoConvertFileType) detectedFileType = result.autoConvertFileType;
        if (result.autoConvertFileName) detectedFileName = result.autoConvertFileName;
        
        // Eğer storage'da yoksa ve sourceUrl varsa, fetch ile al
        if (!xmlContent && sourceUrl) {
            console.log('Storage\'da XML içeriği yok, sourceUrl\'den alınıyor:', sourceUrl);
            try {
                const response = await fetch(sourceUrl);
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status);
                }
                xmlContent = await response.text();
                // XSLT referansını kaldır
                xmlContent = xmlContent.replace(/<\?xml-stylesheet[^>]*\?>/gi, '');
                console.log('XML içeriği sourceUrl\'den alındı, uzunluk:', xmlContent.length);
            } catch (err) {
                console.error('SourceUrl\'den XML alınamadı:', err);
            }
        }
        
        // Eğer hala yoksa, hata göster
        if (!xmlContent) {
            throw new Error('XML içeriği bulunamadı. Lütfen XML dosyasını extension popup\'ından yükleyin.');
        }
        
        // XSLT dosyasını yükle
        const xsltContent = await loadXsltFile(detectedFileType);
        
        // XML'i HTML'e dönüştür
        const htmlContent = await xmlToHtml(xmlContent, xsltContent);
        
        // Türkçe karakter desteği için Open Sans fontunu ekle
        const fullHtml = `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            font-family: 'Open Sans', 'DejaVu Sans', 'Arial', sans-serif !important;
        }
        @media print {
            @page {
                margin: 10mm 5mm;
                size: A4;
            }
            body {
                margin: 0;
                padding: 0;
            }
        }
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>`;
        
        // Preview içeriğini göster
        previewContent.innerHTML = fullHtml;
        
        // Loader'ı gizle, preview'ı göster
        loader.style.display = 'none';
        previewContainer.style.display = 'block';
        
        // Storage'ı temizle (bir sonraki kullanım için)
        chrome.storage.local.remove(['autoConvertXml', 'autoConvertFileType', 'autoConvertFileName', 'autoConvertTimestamp']);
        
    } catch (error) {
        console.error('Preview oluşturma hatası:', error);
        loader.style.display = 'none';
        error.style.display = 'block';
        errorMessage.textContent = error.message || 'Bir hata oluştu';
    }
}

/**
 * PDF'i indirir
 */
async function downloadPdf() {
    try {
        const htmlContent = previewContent.innerHTML;
        await window.downloadHtmlAsPdf(htmlContent, fileName);
    } catch (error) {
        console.error('PDF indirme hatası:', error);
        alert('PDF indirme hatası: ' + error.message);
    }
}

/**
 * Yazdır
 */
function printPreview() {
    window.print();
}

// Event listeners
downloadPdfBtn.addEventListener('click', downloadPdf);
printBtn.addEventListener('click', printPreview);

// Sayfa yüklendiğinde preview'ı oluştur
window.addEventListener('DOMContentLoaded', () => {
    generatePreview();
});
