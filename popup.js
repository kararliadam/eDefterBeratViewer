let currentFile = null;
let currentXmlContent = null;

// DOM Elements
const fileInput = document.getElementById('fileInput');
const uploadBox = document.getElementById('uploadBox');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const formSection = document.getElementById('formSection');
const fileTypeSelect = document.getElementById('fileType');
const convertBtn = document.getElementById('convertBtn');
const resultMessageInline = document.getElementById('resultMessageInline');
const resultMessageText = document.getElementById('resultMessageText');
const errorSection = document.getElementById('errorSection');
const errorMessage = document.getElementById('errorMessage');
const htmlPreviewSection = document.getElementById('htmlPreviewSection');
const htmlPreview = document.getElementById('htmlPreview');
const htmlPreviewLoader = document.getElementById('htmlPreviewLoader');
const closeHtmlPreviewBtn = document.getElementById('closeHtmlPreviewBtn');

// XSLT dosya eşleştirmeleri
const xsltMapping = {
    'DR': 'defterraporu.xslt',
    'KB': 'berat.xslt',
    'YB': 'berat.xslt',
    'K': 'kebir.xslt',
    'Y': 'yevmiye.xslt'
};

// File Input Change
fileInput.addEventListener('change', handleFileSelect);

// Drag and Drop
uploadBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadBox.classList.add('dragover');
});

uploadBox.addEventListener('dragleave', () => {
    uploadBox.classList.remove('dragover');
});

uploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadBox.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

// Upload box click
uploadBox.addEventListener('click', (e) => {
    if (e.target.closest('.btn-select')) {
        return;
    }
    fileInput.click();
});

// Dosya Seç butonu
const selectFileBtn = document.getElementById('selectFileBtn');
selectFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
});

// File Type Change
fileTypeSelect.addEventListener('change', async () => {
    convertBtn.disabled = !fileTypeSelect.value;
    if (fileTypeSelect.value && currentXmlContent) {
        await showHtmlPreview(currentXmlContent, fileTypeSelect.value);
    } else {
        hideHtmlPreview();
    }
});

// Convert Button
convertBtn.addEventListener('click', handleConvert);

// Close HTML Preview Button
if (closeHtmlPreviewBtn) {
    closeHtmlPreviewBtn.addEventListener('click', () => {
        if (htmlPreviewSection) {
            htmlPreviewSection.style.display = 'none';
        }
    });
}

// Remove File Button
document.getElementById('removeFile').addEventListener('click', resetForm);

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

/**
 * Dosya adından dosya türünü otomatik tanır
 */
function detectFileType(fileName) {
    const upperName = fileName.toUpperCase();
    
    if (upperName.includes('-DR-')) {
        return 'DR';
    } else if (upperName.includes('-KB-')) {
        return 'KB';
    } else if (upperName.includes('-YB-')) {
        return 'YB';
    } else if (upperName.includes('-K-') && !upperName.includes('-KB-')) {
        return 'K';
    } else if (upperName.includes('-Y-') && !upperName.includes('-YB-')) {
        return 'Y';
    }
    
    return null;
}

/**
 * XML içeriğinden dosya türünü tespit eder
 */
function detectFileTypeFromContent(xmlContent) {
    const upperContent = xmlContent.toUpperCase().substring(0, 5000);
    
    let fileType = null;
    
    // 1. Root element'e göre tespit
    if (upperContent.includes('<EDEFTER:BERAT')) {
        if (upperContent.includes('ENTRIESTYPE CONTEXTREF="LEDGER_CONTEXT">LEDGER') ||
            (upperContent.includes('ENTRIESTYPE') && upperContent.includes('LEDGER'))) {
            fileType = 'KB';
        } else if (upperContent.includes('ENTRIESTYPE CONTEXTREF="JOURNAL_CONTEXT">JOURNAL') ||
                   (upperContent.includes('ENTRIESTYPE') && upperContent.includes('JOURNAL'))) {
            fileType = 'YB';
        }
    } else if (upperContent.includes('<EDEFTER:DEFTERRAPORU')) {
        fileType = 'DR';
    } else if (upperContent.includes('<EDEFTER:DEFTER')) {
        if (upperContent.includes('ENTRIESTYPE CONTEXTREF="LEDGER_CONTEXT">LEDGER') ||
            (upperContent.includes('ENTRIESTYPE') && upperContent.includes('LEDGER'))) {
            fileType = 'K';
        } else if (upperContent.includes('ENTRIESTYPE CONTEXTREF="JOURNAL_CONTEXT">JOURNAL') ||
                   (upperContent.includes('ENTRIESTYPE') && upperContent.includes('JOURNAL'))) {
            fileType = 'Y';
        }
    }
    
    // 2. uniqueID'ye göre kontrol
    if (!fileType) {
        if (upperContent.includes('UNIQUEID CONTEXTREF') && upperContent.includes('KEB')) {
            fileType = upperContent.includes('<EDEFTER:BERAT') ? 'KB' : 'K';
        } else if (upperContent.includes('UNIQUEID CONTEXTREF') && upperContent.includes('YEV')) {
            fileType = upperContent.includes('<EDEFTER:BERAT') ? 'YB' : 'Y';
        } else if (upperContent.includes('UNIQUEID CONTEXTREF') && upperContent.includes('EDR')) {
            fileType = 'DR';
        }
    }
    
    return fileType;
}

/**
 * XSLT dosyasını extension'dan yükler
 */
async function loadXsltFile(fileType) {
    const xsltFileName = xsltMapping[fileType];
    if (!xsltFileName) {
        throw new Error(`Geçersiz dosya türü: ${fileType}`);
    }
    
    const xsltUrl = chrome.runtime.getURL(`xslt/${xsltFileName}`);
    const response = await fetch(xsltUrl);
    
    if (!response.ok) {
        throw new Error(`XSLT dosyası yüklenemedi: ${xsltFileName}`);
    }
    
    return await response.text();
}

/**
 * XML'i XSLT ile HTML'e dönüştürür
 * Not: XSLTProcessor kullanımı Chrome tarafından uyarı veriyor ancak şu an için çalışıyor.
 * Gelecekte Chrome XSLT'yi kaldırırsa, alternatif bir çözüm gerekebilir.
 */
function xmlToHtml(xmlContent, xsltContent) {
    try {
        // XSLTProcessor'un mevcut olup olmadığını kontrol et
        if (typeof XSLTProcessor === 'undefined') {
            throw new Error('XSLTProcessor desteklenmiyor. Lütfen Chrome\'un güncel bir sürümünü kullanın.');
        }
        
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
        const xsltDoc = parser.parseFromString(xsltContent, 'text/xml');
        
        // XSLT hata kontrolü
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
            throw new Error('XML parse hatası: ' + parserError.textContent);
        }
        
        const xsltError = xsltDoc.querySelector('parsererror');
        if (xsltError) {
            throw new Error('XSLT parse hatası: ' + xsltError.textContent);
        }
        
        // XSLTProcessor kullanarak transform et
        // Chrome'un XSLT uyarısını görmezden geliyoruz (şu an için çalışıyor)
        const processor = new XSLTProcessor();
        processor.importStylesheet(xsltDoc);
        
        const resultDoc = processor.transformToDocument(xmlDoc);
        
        // HTML string'e dönüştür
        return new XMLSerializer().serializeToString(resultDoc);
    } catch (error) {
        console.error('XML to HTML dönüştürme hatası:', error);
        throw error;
    }
}

async function handleFile(file) {
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.xml')) {
        showError('Lütfen bir XML dosyası seçin!');
        return;
    }
    
    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
        showError('Dosya boyutu 10MB\'dan küçük olmalıdır!');
        return;
    }
    
    currentFile = file;
    displayFileInfo(file);
    
    // Dosyayı oku
    try {
        const reader = new FileReader();
        currentXmlContent = await new Promise((resolve, reject) => {
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file, 'UTF-8');
        });
    } catch (error) {
        console.error('Dosya okuma hatası:', error);
        showError('Dosya okunurken bir hata oluştu: ' + error.message);
        return;
    }
    
    // Dosya türünü otomatik tanı
    let detectedType = detectFileType(file.name);
    
    // Eğer dosya adından tespit edilemediyse, içerikten tespit et
    if (!detectedType && currentXmlContent) {
        detectedType = detectFileTypeFromContent(currentXmlContent);
    }
    
    if (detectedType) {
        fileTypeSelect.value = detectedType;
        convertBtn.disabled = false;
        showDetectionInfo(detectedType);
        // HTML önizlemesini göster
        if (currentXmlContent) {
            await showHtmlPreview(currentXmlContent, detectedType);
        }
    } else {
        fileTypeSelect.value = '';
        convertBtn.disabled = true;
        hideDetectionInfo();
    }
    
    formSection.style.display = 'block';
    hideError();
    hideResult();
}

/**
 * Otomatik tespit bilgisini gösterir
 */
function showDetectionInfo(fileType) {
    const typeNames = {
        'DR': 'Defter Raporu',
        'KB': 'Büyük Defter Beratı',
        'YB': 'Yevmiye Beratı',
        'K': 'Kebir Defteri',
        'Y': 'Yevmiye Defteri'
    };
    
    let detectionInfo = document.getElementById('detectionInfo');
    if (!detectionInfo) {
        detectionInfo = document.createElement('div');
        detectionInfo.id = 'detectionInfo';
        detectionInfo.className = 'detection-info';
        formSection.insertBefore(detectionInfo, formSection.firstChild);
    }
    
    detectionInfo.innerHTML = `
        <div class="detection-badge">
            <span class="detection-icon">🔍</span>
            <span>Otomatik tespit: <strong>${typeNames[fileType]}</strong></span>
            <span class="detection-hint">(İsterseniz değiştirebilirsiniz)</span>
        </div>
    `;
    detectionInfo.style.display = 'block';
}

/**
 * Otomatik tespit bilgisini gizler
 */
function hideDetectionInfo() {
    const detectionInfo = document.getElementById('detectionInfo');
    if (detectionInfo) {
        detectionInfo.style.display = 'none';
    }
}

function displayFileInfo(file) {
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    fileInfo.style.display = 'block';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

async function handleConvert() {
    if (!currentFile || !fileTypeSelect.value || !currentXmlContent) {
        showError('Lütfen dosya ve dosya türünü seçin!');
        return;
    }
    
    try {
        // Buton loader'ını göster
        const btnText = convertBtn.querySelector('.btn-text');
        const btnLoader = convertBtn.querySelector('.btn-loader');
        if (btnText) btnText.style.display = 'none';
        if (btnLoader) btnLoader.style.display = 'inline-block';
        convertBtn.disabled = true;
        
        hideError();
        hideResult();
        
        // XSLT dosyasını yükle
        const xsltContent = await loadXsltFile(fileTypeSelect.value);
        
        // XML'i HTML'e dönüştür
        const htmlContent = xmlToHtml(currentXmlContent, xsltContent);
        
        // PDF oluştur ve indir
        await generateAndDownloadPdf(htmlContent, currentFile.name);
        
        // Başarı mesajı göster
        const pdfName = currentFile.name.replace('.xml', '.pdf');
        showResult(`PDF başarıyla indirildi: ${pdfName}`);
        
        // Buton loader'ını gizle ve butonu tekrar aktif et
        if (btnText) btnText.style.display = 'inline';
        if (btnLoader) btnLoader.style.display = 'none';
        convertBtn.disabled = false;
        
    } catch (error) {
        console.error('Convert error:', error);
        
        // Buton loader'ını gizle ve butonu tekrar aktif et
        const btnText = convertBtn.querySelector('.btn-text');
        const btnLoader = convertBtn.querySelector('.btn-loader');
        if (btnText) btnText.style.display = 'inline';
        if (btnLoader) btnLoader.style.display = 'none';
        convertBtn.disabled = false;
        
        showError(error.message || 'Bir hata oluştu');
    }
}

/**
 * HTML içeriğini PDF'e dönüştürür ve indirir
 */
async function generateAndDownloadPdf(htmlContent, originalFileName) {
    // Yeni bir pencerede HTML'i aç
    const printWindow = window.open('', '_blank');
    
    // Türkçe karakter desteği için Open Sans fontunu ekle
    const fullHtml = `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            font-family: 'Open Sans', 'DejaVu Sans', 'Arial', 'Arial Narrow', sans-serif !important;
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
    
    printWindow.document.write(fullHtml);
    printWindow.document.close();
    
    // Font'ların yüklenmesini bekle
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // PDF adını belirle
    const pdfName = originalFileName.replace('.xml', '.pdf');
    
    // Print dialog'u aç (kullanıcı PDF olarak kaydedebilir)
    printWindow.focus();
    printWindow.print();
    
    // Alternatif: jsPDF kullanarak otomatik indirme (isteğe bağlı)
    // Şimdilik print dialog kullanıyoruz, kullanıcı "Save as PDF" seçebilir
}

function showResult(message) {
    if (resultMessageInline && resultMessageText) {
        resultMessageText.textContent = message;
        resultMessageInline.style.display = 'block';
    }
}

function hideResult() {
    if (resultMessageInline) {
        resultMessageInline.style.display = 'none';
    }
}

function showError(message) {
    errorMessage.textContent = message;
    errorSection.style.display = 'block';
}

function hideError() {
    errorSection.style.display = 'none';
}

function resetForm() {
    currentFile = null;
    currentXmlContent = null;
    fileInput.value = '';
    fileTypeSelect.value = '';
    convertBtn.disabled = true;
    
    fileInfo.style.display = 'none';
    formSection.style.display = 'none';
    errorSection.style.display = 'none';
    if (resultMessageInline) {
        resultMessageInline.style.display = 'none';
    }
    if (htmlPreviewSection) {
        htmlPreviewSection.style.display = 'none';
    }
    if (htmlPreview && htmlPreview.src && htmlPreview.src.startsWith('blob:')) {
        URL.revokeObjectURL(htmlPreview.src);
        htmlPreview.src = '';
    }
    hideDetectionInfo();
}

/**
 * HTML önizlemesini gösterir
 */
async function showHtmlPreview(xmlContent, fileType) {
    if (!xmlContent || !fileType || !htmlPreviewSection || !htmlPreview) {
        return;
    }
    
    // Önizleme section'ını göster ve loader'ı aktif et
    htmlPreviewSection.style.display = 'block';
    if (htmlPreviewLoader) {
        htmlPreviewLoader.style.display = 'flex';
    }
    const previewWrapper = document.querySelector('.html-preview-wrapper');
    if (previewWrapper) {
        previewWrapper.style.display = 'none';
    }
    
    try {
        // XSLT dosyasını yükle
        const xsltContent = await loadXsltFile(fileType);
        
        // XML'i HTML'e dönüştür
        const htmlContent = xmlToHtml(xmlContent, xsltContent);
        
        // HTML içeriğini blob olarak oluştur ve iframe'de göster
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
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>`;
        
        const blob = new Blob([fullHtml], { type: 'text/html; charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        // Önceki URL'i temizle
        if (htmlPreview && htmlPreview.src && htmlPreview.src.startsWith('blob:')) {
            URL.revokeObjectURL(htmlPreview.src);
        }
        
        // Loader'ı gizle ve iframe wrapper'ını göster
        if (htmlPreviewLoader) {
            htmlPreviewLoader.style.display = 'none';
        }
        if (previewWrapper) {
            previewWrapper.style.display = 'block';
        }
        if (htmlPreview) {
            htmlPreview.src = url;
        }
        
        // Önizlemeyi yukarı kaydır
        setTimeout(() => {
            htmlPreviewSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
        
    } catch (error) {
        console.error('Önizleme hatası:', error);
        if (htmlPreviewLoader) {
            htmlPreviewLoader.style.display = 'none';
        }
        showError(error.message || 'Önizleme oluşturulamadı');
    }
}

/**
 * HTML önizlemesini gizler
 */
function hideHtmlPreview() {
    if (htmlPreviewSection) {
        htmlPreviewSection.style.display = 'none';
    }
    if (htmlPreview && htmlPreview.src && htmlPreview.src.startsWith('blob:')) {
        URL.revokeObjectURL(htmlPreview.src);
        htmlPreview.src = '';
    }
}
