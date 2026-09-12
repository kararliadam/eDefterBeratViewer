/**
 * Background Service Worker
 * XML dosyalarının otomatik dönüştürülmesi için gerekli işlemleri yönetir
 */

// Eklenti yüklendiğinde
chrome.runtime.onInstalled.addListener(() => {
    console.log('eDefter Berat Görüntüleyici eklentisi yüklendi');
    
    // Context menu oluştur
    chrome.contextMenus.create({
        id: 'convert-xml-to-pdf',
        title: 'PDF\'e Dönüştür',
        contexts: ['page'],
        documentUrlPatterns: ['file://*/*.xml', 'file://*/*.XML']
    });
});

// Context menu tıklandığında
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'convert-xml-to-pdf') {
        convertXmlFile(tab);
    }
});

// XML dosyasını dönüştür
function convertXmlFile(tab) {
    const fileName = tab.url.split('/').pop() || 'document.xml';
    
    // Önce fetch ile XML içeriğini al
    fetch(tab.url)
        .then(response => response.text())
        .then(xmlContent => {
            // XSLT referansını kaldır
            const cleanedXml = xmlContent.replace(/<\?xml-stylesheet[^>]*\?>/gi, '');
            
            // Dosya türünü tespit et
            let fileType = detectFileTypeFromFileName(fileName);
            if (!fileType) {
                fileType = detectFileTypeFromContent(cleanedXml);
            }
            if (!fileType) {
                fileType = 'K'; // Varsayılan
            }
            
            // Storage'a kaydet
            chrome.storage.local.set({
                autoConvertXml: cleanedXml,
                autoConvertFileType: fileType,
                autoConvertFileName: fileName,
                autoConvertTimestamp: Date.now()
            }, () => {
                // Viewer sayfasına yönlendir
                chrome.tabs.update(tab.id, {
                    url: chrome.runtime.getURL(`viewer.html?file=${encodeURIComponent(fileName)}&type=${fileType}`)
                });
            });
        })
        .catch(err => {
            console.error('XML okuma hatası:', err);
            // Hata durumunda da viewer sayfasına yönlendir (kullanıcı dosyayı manuel yükleyebilir)
            chrome.tabs.update(tab.id, {
                url: chrome.runtime.getURL(`viewer.html?file=${encodeURIComponent(fileName)}&type=K`)
            });
        });
}

// Dosya adından tür tespiti
function detectFileTypeFromFileName(fileName) {
    const upperName = fileName.toUpperCase();
    if (upperName.includes('-DR-')) return 'DR';
    if (upperName.includes('-KB-')) return 'KB';
    if (upperName.includes('-YB-')) return 'YB';
    if (upperName.includes('-K-') && !upperName.includes('-KB-')) return 'K';
    if (upperName.includes('-Y-') && !upperName.includes('-YB-')) return 'Y';
    return null;
}

// XML içeriğinden tür tespiti
function detectFileTypeFromContent(xmlContent) {
    const upperContent = xmlContent.toUpperCase().substring(0, 5000);
    let fileType = null;
    
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

// Tab oluşturulduğunda veya güncellendiğinde
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // XML dosyası açıldığında - loading aşamasında yakala
    if (changeInfo.status === 'loading' && tab.url) {
        const url = tab.url.toLowerCase();
        if ((url.endsWith('.xml') || url.includes('.xml?')) && url.startsWith('file://')) {
            console.log('XML dosyası açılıyor, viewer sayfasına yönlendiriliyor:', tab.url);
            
            // Hemen viewer sayfasına yönlendir (content script'e güvenmek yerine)
            const fileName = tab.url.split('/').pop() || 'document.xml';
            const fileType = detectFileTypeFromFileName(fileName) || 'K';
            
            // Viewer sayfasına yönlendir (viewer sayfası XML içeriğini kendisi alacak)
            chrome.tabs.update(tabId, {
                url: chrome.runtime.getURL(`viewer.html?file=${encodeURIComponent(fileName)}&type=${fileType}&source=${encodeURIComponent(tab.url)}`)
            });
        }
    }
});
