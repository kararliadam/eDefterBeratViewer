# eDefter Berat Görüntüleyici Kurulum Talimatları

## Hızlı Kurulum

1. **Chrome'u açın** ve adres çubuğuna şunu yazın:
   ```
   chrome://extensions/
   ```

2. **Geliştirici modunu açın**:
   - Sayfanın sağ üst köşesinde "Geliştirici modu" (Developer mode) toggle'ını açın

3. **Eklentiyi yükleyin**:
   - "Paketlenmemiş uzantı yükle" (Load unpacked) butonuna tıklayın
   - Bu proje klasörünü seçin (`manifest.json` dosyasının bulunduğu klasör)
   - Eklenti yüklenecektir

4. **Kullanmaya başlayın**:
   - Chrome araç çubuğunda eklenti simgesini göreceksiniz
   - Simgeye tıklayarak eklentiyi açabilirsiniz

## Detaylı Adımlar

### Adım 1: Proje Klasörünü Bulun

Proje klasörünü bulun:
```
XML-E-Defter-Viewer/
├── manifest.json
├── popup.html
├── popup.js
├── popup.css
├── viewer.html
├── viewer.js
├── vendor/
├── xslt/
│   ├── berat.xslt
│   ├── defterraporu.xslt
│   ├── kebir.xslt
│   └── yevmiye.xslt
└── README.md
```

### Adım 2: Chrome Eklentileri Sayfasını Açın

Chrome tarayıcınızda:
- Adres çubuğuna `chrome://extensions/` yazın
- Veya menüden: **Üç nokta (⋮) > Diğer araçlar > Uzantılar**

### Adım 3: Geliştirici Modunu Etkinleştirin

Eklentiler sayfasının sağ üst köşesinde:
- "Geliştirici modu" (Developer mode) toggle'ını **AÇIK** konuma getirin

### Adım 4: Eklentiyi Yükleyin

1. "Paketlenmemiş uzantı yükle" (Load unpacked) butonuna tıklayın
2. Açılan dosya seçici penceresinde `manifest.json` dosyasının bulunduğu
   `XML-E-Defter-Viewer` klasörünü seçin
3. "Seç" (Select) butonuna tıklayın

### Adım 5: Eklentiyi Test Edin

1. Chrome araç çubuğunda eklenti simgesini görmelisiniz
2. Icona tıklayın
3. Popup penceresi açılmalı
4. Bir XML dosyası seçerek test edin

## Sorun Giderme

### "Hata: Manifest dosyası geçersiz" hatası

- `manifest.json` dosyasının proje kökünde olduğundan emin olun
- JSON syntax hatası olup olmadığını kontrol edin

### "XSLT dosyası bulunamadı" hatası

- `xslt/` klasöründe tüm XSLT dosyalarının olduğundan emin olun:
  - `berat.xslt`
  - `defterraporu.xslt`
  - `kebir.xslt`
  - `yevmiye.xslt`

### Eklenti görünmüyor

- `chrome://extensions/` sayfasında eklentinin yüklü olduğundan emin olun
- Eklentinin etkin olduğundan emin olun
- Chrome'u yeniden başlatmayı deneyin

### Popup açılmıyor

- Tarayıcı konsolunu açın (F12) ve hata mesajlarını kontrol edin
- Eklentiyi yeniden yükleyin (Yenile düğmesine tıklayın)

## Eklentiyi Güncelleme

Eklentide değişiklik yaptıktan sonra:

1. `chrome://extensions/` sayfasına gidin
2. Eklentinin yanındaki **Yenile** düğmesine tıklayın
3. Değişiklikler otomatik olarak yüklenecektir

## Eklentiyi Kaldırma

1. `chrome://extensions/` sayfasına gidin
2. Eklentinin yanındaki **Kaldır** düğmesine tıklayın
3. Onaylayın

## Notlar

- Eklenti tamamen yerel olarak çalışır, internet bağlantısı sadece Google Fonts için gereklidir
- Tüm işlemler tarayıcıda gerçekleşir, hiçbir veri dışarı gönderilmez
- Eklentiyi Chrome Web Store'a yüklemek isterseniz, simge dosyalarını eklemeniz gerekir
