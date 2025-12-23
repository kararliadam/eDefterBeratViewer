/**
 * Content Script - XML dosyalarını Chrome'da açıldığında yakalar
 * ve otomatik olarak PDF görünümüne yönlendirir
 * 
 * document_start'ta çalışır, böylece Chrome'un XSLT yükleme denemesini engeller
 */

(function() {
    'use strict';
    
    console.log('Content script yüklendi (document_start)');
    
    // URL'den XML dosyası olup olmadığını kontrol et
    const url = window.location.href.toLowerCase();
    const isXmlFile = url.endsWith('.xml') || url.includes('.xml?');
    
    if (!isXmlFile) {
        console.log('XML dosyası değil, çıkılıyor');
        return;
    }
    
    console.log('XML dosyası tespit edildi:', url);
    
    // Dosya adından tür tespiti
    function detectFileType(fileName) {
        const upperName = fileName.toUpperCase();
        // Önce daha spesifik olanları kontrol et
        if (upperName.includes('-KB-')) return 'KB';
        if (upperName.includes('-YB-')) return 'YB';
        if (upperName.includes('-DR-')) return 'DR';
        // Sonra genel olanları kontrol et (KB ve YB'yi zaten kontrol ettik)
        if (upperName.includes('-K-')) return 'K';
        if (upperName.includes('-Y-')) return 'Y';
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
    
    // XML içeriğindeki XSLT referansını kaldır
    function removeXsltReference(xmlContent) {
        // <?xml-stylesheet ... ?> processing instruction'ını kaldır
        // Bu, Chrome'un file:// protokolünde XSLT dosyasını yüklemeye çalışmasını engeller
        return xmlContent.replace(/<\?xml-stylesheet[^>]*\?>/gi, '');
    }
    
    // Sayfayı hemen durdur ve viewer sayfasına yönlendir
    // Bu, Chrome'un XML'i parse edip XSLT yüklemeye çalışmasını engeller
    const fileName = window.location.pathname.split('/').pop() || 'document.xml';
    console.log('Dosya adı:', fileName);
    const quickFileType = detectFileType(fileName) || 'K'; // Varsayılan K
    console.log('Hızlı tespit edilen tür:', quickFileType);
    
    // Sayfanın yüklenmesini engelle
    if (document.documentElement) {
        document.documentElement.innerHTML = '';
    }
    if (document.body) {
        document.body.innerHTML = '<div style="padding: 20px; text-align: center; font-family: Arial;"><p>XML dosyası işleniyor...</p></div>';
    }
    
    // XML içeriğini fetch ile al ve viewer sayfasına yönlendir
    console.log('XML içeriği fetch ediliyor...');
    fetch(window.location.href)
        .then(response => {
            console.log('Fetch response:', response.status, response.statusText);
            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }
            return response.text();
        })
        .then(xmlContent => {
            console.log('XML içeriği alındı, uzunluk:', xmlContent.length);
            
            // XSLT referansını kaldır
            const cleanedXml = removeXsltReference(xmlContent);
            console.log('XSLT referansı kaldırıldı, yeni uzunluk:', cleanedXml.length);
            
            // Dosya türünü tekrar kontrol et (içerikten)
            let detectedType = detectFileType(fileName);
            console.log('Dosya adından tespit:', detectedType);
            
            if (!detectedType) {
                detectedType = detectFileTypeFromContent(cleanedXml);
                console.log('İçerikten tespit:', detectedType);
            }
            
            if (!detectedType) {
                detectedType = quickFileType;
                console.log('Varsayılan tür kullanılıyor:', detectedType);
            }
            
            console.log('Final tespit edilen dosya türü:', detectedType);
            
            // Storage'a kaydet
            chrome.storage.local.set({
                autoConvertXml: cleanedXml,
                autoConvertFileType: detectedType,
                autoConvertFileName: fileName,
                autoConvertTimestamp: Date.now()
            }, () => {
                if (chrome.runtime.lastError) {
                    console.error('Storage hatası:', chrome.runtime.lastError);
                    // Hata durumunda da viewer sayfasına yönlendir
                    const viewerUrl = chrome.runtime.getURL(`viewer.html?file=${encodeURIComponent(fileName)}&type=${detectedType}`);
                    console.log('Storage hatası, direkt yönlendiriliyor:', viewerUrl);
                    window.location.href = viewerUrl;
                    return;
                }
                
                console.log('Storage\'a kaydedildi, viewer sayfasına yönlendiriliyor');
                
                // Viewer sayfasına yönlendir
                const viewerUrl = chrome.runtime.getURL(`viewer.html?file=${encodeURIComponent(fileName)}&type=${detectedType}`);
                console.log('Viewer URL:', viewerUrl);
                window.location.href = viewerUrl;
            });
        })
        .catch(err => {
            console.error('XML okuma hatası:', err);
            // Hata durumunda da viewer sayfasına yönlendir
            const viewerUrl = chrome.runtime.getURL(`viewer.html?file=${encodeURIComponent(fileName)}&type=${quickFileType}`);
            console.log('Hata durumunda yönlendiriliyor:', viewerUrl);
            window.location.href = viewerUrl;
        });
    
})();
