let currentFile = null;
let currentXmlContent = null;
let archiveEntries = [];
let archiveWarnings = [];
let archiveTruncated = false;
let selectedArchiveEntryId = null;
let selectionRequestId = 0;
let fileLoadRequestId = 0;
let previewRequestId = 0;

const MAX_XML_FILE_SIZE = 10 * 1024 * 1024;
const MAX_ARCHIVE_SIZE = 50 * 1024 * 1024;
const MAX_NESTED_ARCHIVE_SIZE = 50 * 1024 * 1024;
const MAX_ARCHIVE_ENTRIES = 500;
const MAX_NESTED_ZIP_DEPTH = 3;
const FILE_DATABASE_NAME = 'xml-berat-file-transfer';
const FILE_DATABASE_VERSION = 1;
const FILE_STORE_NAME = 'pending-files';

const pageParams = new URLSearchParams(window.location.search);
const pendingFileId = pageParams.get('fileId') || pageParams.get('archiveId');
const isWorkspacePage = Boolean(pendingFileId) ||
    pageParams.get('workspace') === '1' ||
    document.body.classList.contains('workspace-page');

if (isWorkspacePage) {
    document.body.classList.add('workspace-page');
    document.title = 'XML Berat PDF Dönüştürücü';
}

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
const previewEmptyState = document.getElementById('previewEmptyState');
const archiveSection = document.getElementById('archiveSection');
const archiveSummary = document.getElementById('archiveSummary');
const archiveCount = document.getElementById('archiveCount');
const archiveSearch = document.getElementById('archiveSearch');
const archiveTypeFilter = document.getElementById('archiveTypeFilter');
const archiveDateFilter = document.getElementById('archiveDateFilter');
const archiveList = document.getElementById('archiveList');

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
        showPreviewEmptyState();
    });
}

// Remove File Button
document.getElementById('removeFile').addEventListener('click', resetForm);
document.getElementById('retryBtn').addEventListener('click', resetForm);

archiveSearch.addEventListener('input', renderArchiveEntries);
archiveTypeFilter.addEventListener('change', renderArchiveEntries);
archiveDateFilter.addEventListener('change', renderArchiveEntries);

initializeWorkspacePage();

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

async function initializeWorkspacePage() {
    if (!isWorkspacePage) {
        return;
    }

    const headerDescription = document.querySelector('header p');
    const uploadText = document.querySelector('.upload-text');
    if (headerDescription) {
        headerDescription.textContent = 'XML belgelerinizi geniş ekranda inceleyin';
    }
    if (uploadText) {
        uploadText.textContent = 'Başka bir XML veya ZIP dosyası yükleyin';
    }

    if (!pendingFileId) {
        return;
    }

    fileInput.disabled = true;
    const uploadTextElement = document.querySelector('.upload-text');
    if (uploadTextElement) {
        uploadTextElement.textContent = 'Popup\'tan seçilen dosya alınıyor…';
    }

    try {
        const file = await takePendingFile(pendingFileId);
        if (!file) {
            throw new Error('Aktarılan dosya bulunamadı. Lütfen dosyayı yeniden seçin.');
        }
        window.history.replaceState(null, '', `${window.location.pathname}?workspace=1`);
        await handleFile(file);
    } catch (error) {
        window.history.replaceState(null, '', `${window.location.pathname}?workspace=1`);
        showError(error.message || 'Dosya normal sayfada açılamadı.');
    } finally {
        fileInput.disabled = false;
        if (uploadText) {
            uploadText.textContent = 'Başka bir XML veya ZIP dosyası yükleyin';
        }
    }
}

function canOpenWorkspaceTab() {
    return !isWorkspacePage &&
        typeof chrome !== 'undefined' &&
        chrome.runtime &&
        typeof chrome.runtime.getURL === 'function' &&
        chrome.tabs &&
        typeof chrome.tabs.create === 'function' &&
        typeof indexedDB !== 'undefined';
}

async function openFileInFullPage(file) {
    const fileId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    fileInput.disabled = true;
    selectFileBtn.disabled = true;
    const uploadText = document.querySelector('.upload-text');
    if (uploadText) {
        uploadText.textContent = 'Dosya tam sayfada açılıyor…';
    }

    try {
        await savePendingFile(fileId, file);
        const targetUrl = chrome.runtime.getURL(`popup.html?fileId=${encodeURIComponent(fileId)}`);
        await chrome.tabs.create({ url: targetUrl, active: true });
        window.close();
    } catch (error) {
        console.error('Dosya sekmesi açılamadı:', error);
        await deletePendingFile(fileId).catch(() => {});
        fileInput.disabled = false;
        selectFileBtn.disabled = false;
        if (uploadText) {
            uploadText.textContent = 'Dosyayı buraya sürükleyin veya tıklayın';
        }
        showError('Dosya normal sayfada açılamadı: ' + (error.message || 'Bilinmeyen hata'));
    }
}

function openFileDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(FILE_DATABASE_NAME, FILE_DATABASE_VERSION);
        request.onupgradeneeded = () => {
            const database = request.result;
            if (!database.objectStoreNames.contains(FILE_STORE_NAME)) {
                database.createObjectStore(FILE_STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Geçici dosya alanı açılamadı.'));
    });
}

async function savePendingFile(id, file) {
    const database = await openFileDatabase();
    try {
        await runFileTransaction(database, 'readwrite', store => store.put({
            id,
            blob: file,
            name: file.name,
            type: file.type,
            lastModified: file.lastModified,
            createdAt: Date.now()
        }));
    } finally {
        database.close();
    }
}

async function takePendingFile(id) {
    const database = await openFileDatabase();
    try {
        const record = await runFileTransaction(database, 'readonly', store => store.get(id));
        if (!record) {
            return null;
        }
        await runFileTransaction(database, 'readwrite', store => store.delete(id));
        return new File([record.blob], record.name, {
            type: record.type || 'application/octet-stream',
            lastModified: record.lastModified || record.createdAt
        });
    } finally {
        database.close();
    }
}

async function deletePendingFile(id) {
    if (typeof indexedDB === 'undefined') {
        return;
    }
    const database = await openFileDatabase();
    try {
        await runFileTransaction(database, 'readwrite', store => store.delete(id));
    } finally {
        database.close();
    }
}

function runFileTransaction(database, mode, operation) {
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(FILE_STORE_NAME, mode);
        const request = operation(transaction.objectStore(FILE_STORE_NAME));
        let result;
        request.onsuccess = () => {
            result = request.result;
        };
        request.onerror = () => reject(request.error || new Error('Geçici dosya işlemi başarısız oldu.'));
        transaction.oncomplete = () => resolve(result);
        transaction.onabort = () => reject(transaction.error || new Error('Geçici dosya işlemi iptal edildi.'));
    });
}

async function handleFile(file) {
    const loadRequestId = ++fileLoadRequestId;
    selectionRequestId++;
    const lowerName = file.name.toLowerCase();
    const isXml = lowerName.endsWith('.xml');
    const isZip = lowerName.endsWith('.zip');

    if (!isXml && !isZip) {
        showError('Lütfen bir XML veya ZIP dosyası seçin!');
        return;
    }

    if (isZip && file.size > MAX_ARCHIVE_SIZE) {
        showError('ZIP dosyası 50 MB\'dan küçük olmalıdır!');
        return;
    }

    if (isXml && file.size > MAX_XML_FILE_SIZE) {
        showError('XML dosyası 10 MB\'dan küçük olmalıdır!');
        return;
    }

    if (canOpenWorkspaceTab()) {
        hideError();
        await openFileInFullPage(file);
        return;
    }

    clearSelectedDocument();
    hideError();
    hideResult();
    displayFileInfo(file);

    if (isZip) {
        await handleZipFile(file, loadRequestId);
        return;
    }

    hideArchiveSection();

    try {
        const xmlContent = await readFileAsText(file);
        if (loadRequestId !== fileLoadRequestId) {
            return;
        }
        await prepareXmlDocument(file, xmlContent);
    } catch (error) {
        console.error('Dosya okuma hatası:', error);
        showError('Dosya okunurken bir hata oluştu: ' + error.message);
    }
}

async function handleZipFile(file, loadRequestId) {
    if (typeof JSZip === 'undefined') {
        showError('ZIP desteği yüklenemedi. Eklentiyi yeniden yükleyip tekrar deneyin.');
        return;
    }

    if (file.size > MAX_ARCHIVE_SIZE) {
        showError('ZIP dosyası 50 MB\'dan küçük olmalıdır!');
        return;
    }

    archiveEntries = [];
    archiveWarnings = [];
    archiveTruncated = false;
    archiveSearch.value = '';
    archiveTypeFilter.value = '';
    archiveDateFilter.replaceChildren(new Option('Tüm tarihler', ''));
    archiveSearch.disabled = true;
    archiveSection.style.display = 'flex';
    archiveSummary.textContent = 'Arşiv taranıyor…';
    archiveCount.textContent = '';
    showArchiveLoading();

    try {
        const zip = await JSZip.loadAsync(file);
        if (loadRequestId !== fileLoadRequestId) {
            return;
        }

        const scanState = { warnings: [], nextId: 1, truncated: false, loadRequestId };
        await collectArchiveXmlEntries(zip, '', 0, scanState);
        if (loadRequestId !== fileLoadRequestId) {
            return;
        }
        archiveWarnings = scanState.warnings;
        archiveTruncated = scanState.truncated;

        archiveEntries.sort((a, b) => a.path.localeCompare(b.path, 'tr', {
            numeric: true,
            sensitivity: 'base'
        }));

        updateArchiveDateFilterOptions();
        archiveSearch.disabled = false;
        updateArchiveSummary();
        renderArchiveEntries();

        const firstAvailableEntry = archiveEntries.find(entry => !entry.error);
        if (firstAvailableEntry) {
            await selectArchiveEntry(firstAvailableEntry.id);
        } else if (archiveEntries.length === 0) {
            showError('ZIP içinde XML dosyası bulunamadı.');
        } else {
            showError('ZIP içindeki XML dosyaları boyut sınırını aşıyor.');
        }
    } catch (error) {
        console.error('ZIP okuma hatası:', error);
        archiveSummary.textContent = 'Arşiv okunamadı.';
        archiveList.replaceChildren();
        showError('ZIP dosyası okunamadı: ' + normalizeZipError(error));
    }
}

async function collectArchiveXmlEntries(zip, parentPath, depth, scanState) {
    const entries = Object.values(zip.files)
        .filter(entry => !entry.dir)
        .sort((a, b) => a.name.localeCompare(b.name, 'tr', { numeric: true, sensitivity: 'base' }));

    for (const zipEntry of entries) {
        if (scanState.loadRequestId !== fileLoadRequestId) {
            return;
        }
        if (archiveEntries.length >= MAX_ARCHIVE_ENTRIES) {
            scanState.truncated = true;
            return;
        }

        const entryName = zipEntry.name;
        const lowerName = entryName.toLowerCase();
        const displayPath = parentPath ? `${parentPath} › ${entryName}` : entryName;
        const uncompressedSize = getZipEntrySize(zipEntry);

        if (lowerName.endsWith('.xml')) {
            archiveEntries.push({
                id: `archive-entry-${scanState.nextId++}`,
                name: entryName.split('/').pop() || entryName,
                path: displayPath,
                size: uncompressedSize,
                zipEntry,
                detectedType: detectFileType(entryName),
                dateKey: extractArchiveDate(entryName),
                error: uncompressedSize !== null && uncompressedSize > MAX_XML_FILE_SIZE
                    ? '10 MB sınırını aşıyor'
                    : null
            });
            continue;
        }

        if (!lowerName.endsWith('.zip')) {
            continue;
        }

        if (depth >= MAX_NESTED_ZIP_DEPTH) {
            scanState.warnings.push(`${displayPath}: iç içe ZIP derinlik sınırı aşıldı.`);
            continue;
        }

        if (uncompressedSize !== null && uncompressedSize > MAX_NESTED_ARCHIVE_SIZE) {
            scanState.warnings.push(`${displayPath}: 50 MB sınırını aştığı için taranmadı.`);
            continue;
        }

        try {
            const nestedData = await zipEntry.async('uint8array');
            const nestedZip = await JSZip.loadAsync(nestedData);
            await collectArchiveXmlEntries(nestedZip, displayPath, depth + 1, scanState);
            if (scanState.truncated) {
                return;
            }
        } catch (error) {
            scanState.warnings.push(`${displayPath}: alt ZIP okunamadı.`);
            console.warn('Alt ZIP okunamadı:', displayPath, error);
        }
    }
}

async function selectArchiveEntry(entryId) {
    const entry = archiveEntries.find(item => item.id === entryId);
    if (!entry || entry.error) {
        return;
    }

    const requestId = ++selectionRequestId;
    selectedArchiveEntryId = entryId;
    renderArchiveEntries();
    clearSelectedDocument(false);
    hideError();
    hideResult();
    archiveSummary.textContent = `${entry.path} açılıyor…`;

    try {
        const xmlContent = await entry.zipEntry.async('string');
        if (requestId !== selectionRequestId) {
            return;
        }

        const actualSize = new Blob([xmlContent]).size;
        if (actualSize > MAX_XML_FILE_SIZE) {
            entry.error = '10 MB sınırını aşıyor';
            renderArchiveEntries();
            throw new Error(`${entry.name} 10 MB sınırını aşıyor.`);
        }

        entry.size = actualSize;
        const selectedFile = {
            name: entry.name,
            size: actualSize,
            archivePath: entry.path
        };
        await prepareXmlDocument(selectedFile, xmlContent, entry);
        updateArchiveSummary();
        renderArchiveEntries();
    } catch (error) {
        if (requestId !== selectionRequestId) {
            return;
        }
        console.error('Arşivdeki XML okunamadı:', error);
        showError('XML dosyası açılamadı: ' + normalizeZipError(error));
        updateArchiveSummary();
    }
}

async function prepareXmlDocument(file, xmlContent, archiveEntry = null) {
    currentFile = file;
    currentXmlContent = xmlContent;

    let detectedType = detectFileType(file.name);
    if (!detectedType) {
        detectedType = detectFileTypeFromContent(xmlContent);
    }
    if (archiveEntry) {
        archiveEntry.detectedType = detectedType;
    }

    formSection.style.display = 'block';
    hideError();
    hideResult();

    if (detectedType) {
        fileTypeSelect.value = detectedType;
        convertBtn.disabled = false;
        showDetectionInfo(detectedType);
        await showHtmlPreview(xmlContent, detectedType);
    } else {
        fileTypeSelect.value = '';
        convertBtn.disabled = true;
        hideDetectionInfo();
        hideHtmlPreview();
    }
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = event => resolve(event.target.result);
        reader.onerror = () => reject(reader.error || new Error('Dosya okunamadı.'));
        reader.readAsText(file, 'UTF-8');
    });
}

function getZipEntrySize(zipEntry) {
    const size = zipEntry && zipEntry._data && zipEntry._data.uncompressedSize;
    return Number.isFinite(size) ? size : null;
}

function extractArchiveDate(filePath) {
    const match = String(filePath).match(/(?:^|[^0-9])((?:19|20)\d{2})(0[1-9]|1[0-2])(?:[^0-9]|$)/);
    return match ? `${match[1]}-${match[2]}` : '';
}

function formatArchiveDateLabel(dateKey) {
    const [year, month] = dateKey.split('-').map(Number);
    return new Intl.DateTimeFormat('tr-TR', {
        month: 'long',
        year: 'numeric'
    }).format(new Date(year, month - 1, 1));
}

function updateArchiveDateFilterOptions() {
    const selectedDate = archiveDateFilter.value;
    const dates = [...new Set(
        archiveEntries.map(entry => entry.dateKey).filter(Boolean)
    )].sort();

    const fragment = document.createDocumentFragment();
    const allDates = document.createElement('option');
    allDates.value = '';
    allDates.textContent = 'Tüm tarihler';
    fragment.appendChild(allDates);

    for (const dateKey of dates) {
        const option = document.createElement('option');
        option.value = dateKey;
        option.textContent = formatArchiveDateLabel(dateKey);
        fragment.appendChild(option);
    }

    archiveDateFilter.replaceChildren(fragment);
    archiveDateFilter.value = dates.includes(selectedDate) ? selectedDate : '';
}

function normalizeZipError(error) {
    const message = error && error.message ? error.message : 'Bilinmeyen hata';
    if (/encrypted/i.test(message)) {
        return 'Şifreli ZIP dosyaları desteklenmiyor.';
    }
    if (/central directory|corrupted|invalid/i.test(message)) {
        return 'Dosya geçerli bir ZIP arşivi değil veya bozulmuş.';
    }
    return message;
}

function showArchiveLoading() {
    const loading = document.createElement('div');
    loading.className = 'archive-empty';
    loading.textContent = 'XML dosyaları aranıyor…';
    archiveList.replaceChildren(loading);
}

function updateArchiveSummary(warnings = archiveWarnings) {
    const nestedCount = archiveEntries.filter(entry => entry.path.includes(' › ')).length;
    const parts = [`${archiveEntries.length} XML bulundu`];
    if (nestedCount) {
        parts.push(`${nestedCount} tanesi alt ZIP içinde`);
    }
    if (warnings.length) {
        parts.push(`${warnings.length} alt ZIP taranamadı`);
    }
    if (archiveTruncated) {
        parts.push(`liste ${MAX_ARCHIVE_ENTRIES} XML ile sınırlandı`);
    }
    archiveSummary.textContent = parts.join(' • ');
}

function renderArchiveEntries() {
    const query = archiveSearch.value.trim().toLocaleLowerCase('tr-TR');
    const selectedType = archiveTypeFilter.value;
    const selectedDate = archiveDateFilter.value;
    const filteredEntries = archiveEntries.filter(entry => {
        const matchesQuery = entry.path.toLocaleLowerCase('tr-TR').includes(query);
        const matchesType = !selectedType || entry.detectedType === selectedType;
        const matchesDate = !selectedDate || entry.dateKey === selectedDate;
        return matchesQuery && matchesType && matchesDate;
    });

    const hasFilters = Boolean(query || selectedType || selectedDate);
    archiveCount.textContent = hasFilters
        ? `${filteredEntries.length}/${archiveEntries.length}`
        : `${archiveEntries.length} XML`;

    if (filteredEntries.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'archive-empty';
        empty.textContent = archiveEntries.length === 0
            ? 'Bu arşivde XML dosyası yok.'
            : 'Filtrelerle eşleşen XML bulunamadı.';
        archiveList.replaceChildren(empty);
        return;
    }

    const fragment = document.createDocumentFragment();
    for (const entry of filteredEntries) {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'archive-item';
        item.setAttribute('role', 'listitem');
        item.disabled = Boolean(entry.error);
        if (entry.id === selectedArchiveEntryId) {
            item.classList.add('selected');
        }

        const main = document.createElement('span');
        main.className = 'archive-item-main';

        const itemName = document.createElement('span');
        itemName.className = 'archive-item-name';
        itemName.textContent = entry.name;

        const itemPath = document.createElement('span');
        itemPath.className = 'archive-item-path';
        itemPath.textContent = entry.path;

        main.append(itemName, itemPath);

        const meta = document.createElement('span');
        meta.className = 'archive-item-meta';

        const typeBadge = document.createElement('span');
        typeBadge.className = 'archive-type-badge';
        typeBadge.textContent = entry.error ? 'Atlandı' : (entry.detectedType || 'XML');

        const size = document.createElement('span');
        size.className = 'archive-item-size';
        size.textContent = entry.error || (entry.size === null ? 'Boyut bilinmiyor' : formatFileSize(entry.size));

        meta.append(typeBadge, size);
        item.append(main, meta);
        item.addEventListener('click', () => selectArchiveEntry(entry.id));
        fragment.appendChild(item);
    }

    archiveList.replaceChildren(fragment);
}

function hideArchiveSection() {
    archiveEntries = [];
    archiveWarnings = [];
    archiveTruncated = false;
    selectedArchiveEntryId = null;
    archiveSearch.value = '';
    archiveTypeFilter.value = '';
    archiveDateFilter.replaceChildren(new Option('Tüm tarihler', ''));
    archiveSection.style.display = 'none';
    archiveList.replaceChildren();
}

function clearSelectedDocument(clearSelection = true) {
    currentFile = null;
    currentXmlContent = null;
    if (clearSelection) {
        selectedArchiveEntryId = null;
    }
    fileTypeSelect.value = '';
    convertBtn.disabled = true;
    formSection.style.display = 'none';
    hideDetectionInfo();
    hideHtmlPreview();
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
            <span class="detection-icon" aria-hidden="true">
                <svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
            </span>
            <span>Otomatik tespit:</span>
            <strong>${typeNames[fileType]}</strong>
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
    document.body.classList.add('has-file');
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
        const htmlContent = await xmlToHtml(currentXmlContent, xsltContent);
        
        // PDF oluştur ve indir
        await generateAndDownloadPdf(htmlContent, currentFile.name);
        
        // Başarı mesajı göster
        const pdfName = currentFile.name.replace(/\.xml$/i, '.pdf');
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

/** HTML içeriğini yeni pencere açmadan PDF olarak indirir. */
async function generateAndDownloadPdf(htmlContent, originalFileName) {
    await window.downloadHtmlAsPdf(htmlContent, originalFileName);
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
    fileLoadRequestId++;
    selectionRequestId++;
    currentFile = null;
    currentXmlContent = null;
    document.body.classList.remove('has-file');
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
    hideArchiveSection();
    hideDetectionInfo();
}

/**
 * HTML önizlemesini gösterir
 */
async function showHtmlPreview(xmlContent, fileType) {
    if (!xmlContent || !fileType || !htmlPreviewSection || !htmlPreview) {
        return;
    }
    
    const requestId = ++previewRequestId;

    if (previewEmptyState) {
        previewEmptyState.style.display = 'none';
    }

    // Önizleme section'ını göster ve loader'ı aktif et
    htmlPreviewSection.style.display = 'flex';
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
        if (requestId !== previewRequestId) {
            return;
        }
        
        // XML'i HTML'e dönüştür
        const htmlContent = await xmlToHtml(xmlContent, xsltContent);
        
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
    previewRequestId++;
    if (htmlPreviewSection) {
        htmlPreviewSection.style.display = 'none';
    }
    if (previewEmptyState) {
        previewEmptyState.style.display = 'none';
    }
    if (htmlPreview && htmlPreview.src && htmlPreview.src.startsWith('blob:')) {
        URL.revokeObjectURL(htmlPreview.src);
        htmlPreview.src = '';
    }
}

function showPreviewEmptyState() {
    previewRequestId++;
    if (htmlPreviewSection) {
        htmlPreviewSection.style.display = 'none';
    }
    if (previewEmptyState && document.body.classList.contains('has-file')) {
        previewEmptyState.style.display = 'flex';
    }
    if (htmlPreview && htmlPreview.src && htmlPreview.src.startsWith('blob:')) {
        URL.revokeObjectURL(htmlPreview.src);
        htmlPreview.src = '';
    }
}
