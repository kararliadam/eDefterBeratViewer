/**
 * Context Menu - XML dosyalarına sağ tıklayınca "PDF'e Dönüştür" seçeneği
 */

// Context menu oluştur
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'convert-xml-to-pdf',
        title: 'PDF\'e Dönüştür',
        contexts: ['link', 'page'],
        documentUrlPatterns: ['file://*/*.xml', 'file://*/*.XML']
    });
});

// Context menu tıklandığında
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'convert-xml-to-pdf') {
        // Tab'ı aç ve viewer sayfasına yönlendir
        chrome.tabs.update(tab.id, {
            url: chrome.runtime.getURL(`viewer.html?file=${encodeURIComponent(tab.url)}&type=KB`)
        });
    }
});
