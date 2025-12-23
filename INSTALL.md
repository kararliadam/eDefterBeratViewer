# Chrome Extension Kurulum Talimatları

## Hızlı Kurulum

1. **Chrome'u açın** ve adres çubuğuna şunu yazın:
   ```
   chrome://extensions/
   ```

2. **Geliştirici modunu açın**:
   - Sayfanın sağ üst köşesinde "Geliştirici modu" (Developer mode) toggle'ını açın

3. **Extension'ı yükleyin**:
   - "Paketlenmemiş uzantı yükle" (Load unpacked) butonuna tıklayın
   - `extension` klasörünü seçin
   - Extension yüklenecektir

4. **Kullanmaya başlayın**:
   - Chrome toolbar'ında extension iconunu göreceksiniz
   - Icona tıklayarak extension'ı açabilirsiniz

## Detaylı Adımlar

### Adım 1: Extension Klasörünü Bulun

Proje klasörünüzde `extension` klasörünü bulun:
```
berat/
└── extension/
    ├── manifest.json
    ├── popup.html
    ├── popup.js
    ├── popup.css
    ├── xslt/
    │   ├── berat.xslt
    │   ├── defterraporu.xslt
    │   ├── kebir.xslt
    │   └── yevmiye.xslt
    └── README.md
```

### Adım 2: Chrome Extensions Sayfasını Açın

Chrome tarayıcınızda:
- Adres çubuğuna `chrome://extensions/` yazın
- Veya menüden: **Üç nokta (⋮) > Diğer araçlar > Uzantılar**

### Adım 3: Geliştirici Modunu Aktifleştirin

Extensions sayfasının sağ üst köşesinde:
- "Geliştirici modu" (Developer mode) toggle'ını **AÇIK** konuma getirin

### Adım 4: Extension'ı Yükleyin

1. "Paketlenmemiş uzantı yükle" (Load unpacked) butonuna tıklayın
2. Açılan dosya seçici penceresinde:
   - `berat` klasörüne gidin
   - `extension` klasörünü seçin
   - "Seç" (Select) butonuna tıklayın

### Adım 5: Extension'ı Test Edin

1. Chrome toolbar'ında extension iconunu görmelisiniz
2. Icona tıklayın
3. Popup penceresi açılmalı
4. Bir XML dosyası seçerek test edin

## Sorun Giderme

### "Hata: Manifest dosyası geçersiz" hatası

- `manifest.json` dosyasının `extension` klasörünün içinde olduğundan emin olun
- JSON syntax hatası olup olmadığını kontrol edin

### "XSLT dosyası bulunamadı" hatası

- `extension/xslt/` klasöründe tüm XSLT dosyalarının olduğundan emin olun:
  - `berat.xslt`
  - `defterraporu.xslt`
  - `kebir.xslt`
  - `yevmiye.xslt`

### Extension görünmüyor

- `chrome://extensions/` sayfasında extension'ın yüklü olduğundan emin olun
- Extension'ın etkin (enabled) olduğundan emin olun
- Chrome'u yeniden başlatmayı deneyin

### Popup açılmıyor

- Tarayıcı konsolunu açın (F12) ve hata mesajlarını kontrol edin
- Extension'ı yeniden yükleyin (reload butonuna tıklayın)

## Extension'ı Güncelleme

Extension'da değişiklik yaptıktan sonra:

1. `chrome://extensions/` sayfasına gidin
2. Extension'ın yanındaki **Yenile (Reload)** butonuna tıklayın
3. Değişiklikler otomatik olarak yüklenecektir

## Extension'ı Kaldırma

1. `chrome://extensions/` sayfasına gidin
2. Extension'ın yanındaki **Kaldır (Remove)** butonuna tıklayın
3. Onaylayın

## Notlar

- Extension tamamen yerel olarak çalışır, internet bağlantısı sadece Google Fonts için gereklidir
- Tüm işlemler tarayıcıda gerçekleşir, hiçbir veri dışarı gönderilmez
- Extension'ı Chrome Web Store'a yüklemek isterseniz, icon dosyalarını eklemeniz gerekir
