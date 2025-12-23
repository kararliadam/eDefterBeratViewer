# XML Berat PDF Dönüştürücü - Chrome Extension

Bu Chrome Extension, e-defter berat XML dosyalarını PDF formatına dönüştürmenizi sağlar. Web uygulamasının tüm özelliklerini tarayıcı uzantısı olarak kullanabilirsiniz.

## Özellikler

- 🚀 **Otomatik Dönüştürme**: XML dosyasını Chrome'da açtığınızda otomatik olarak PDF görünümüne dönüştürülür
- 📤 Drag & Drop dosya yükleme
- 🔍 Otomatik dosya türü tespiti (dosya adından ve XML içeriğinden)
- 📋 Dosya türü seçimi (DR, KB, YB, K, Y) - otomatik tespit edilen türü manuel olarak değiştirebilirsiniz
- 👁️ HTML önizleme - PDF oluşturmadan önce görünümü kontrol edin
- 📥 PDF indirme - Chrome'un print dialog'u ile PDF olarak kaydedin
- 🖨️ Direkt yazdırma desteği
- 🎨 Modern ve kullanıcı dostu arayüz

## Kurulum

### 1. Extension'ı Yükleme

1. Chrome tarayıcınızı açın
2. Adres çubuğuna `chrome://extensions/` yazın ve Enter'a basın
3. Sağ üst köşede "Geliştirici modu" (Developer mode) seçeneğini açın
4. "Paketlenmemiş uzantı yükle" (Load unpacked) butonuna tıklayın
5. `extension` klasörünü seçin
6. Extension yüklenecek ve Chrome toolbar'ında görünecektir

### 2. Icon Dosyalarını Ekleme (Opsiyonel)

Extension'ın icon dosyalarını eklemek için:

1. `extension/icons/` klasörüne aşağıdaki boyutlarda icon dosyaları ekleyin:
   - `icon16.png` (16x16 piksel)
   - `icon48.png` (48x48 piksel)
   - `icon128.png` (128x128 piksel)

2. Icon dosyaları yoksa, Chrome varsayılan bir icon gösterecektir (bu da çalışır)

## Kullanım

### Yöntem 1: Otomatik Dönüştürme (Önerilen)

1. XML dosyanızı Chrome'da açın (dosyaya çift tıklayın veya Chrome'dan File > Open ile açın)
2. Extension otomatik olarak XML dosyasını tespit eder
3. Dosya türü otomatik olarak belirlenir
4. PDF görünümü otomatik olarak açılır
5. "PDF İndir" butonuna tıklayarak PDF'i kaydedin veya "Yazdır" butonu ile yazdırın

### Yöntem 2: Popup ile Kullanım

1. Chrome toolbar'ındaki extension iconuna tıklayın
2. Açılan popup pencerede XML dosyanızı sürükleyip bırakın veya "Dosya Seç" butonuna tıklayın
3. Sistem otomatik olarak dosya türünü tespit edecektir (isterseniz manuel olarak değiştirebilirsiniz)
4. HTML önizlemesi otomatik olarak gösterilecektir
5. "PDF İndir" butonuna tıklayın
6. Chrome'un print dialog'u açılacaktır
7. "Hedef" (Destination) olarak "PDF olarak kaydet" (Save as PDF) seçin
8. PDF'i kaydedin

## Desteklenen Dosya Türleri

| Dosya Türü | XSLT Dosyası | Açıklama |
|------------|--------------|----------|
| DR | defterraporu.xslt | Defter Raporu |
| KB | berat.xslt | Büyük Defter Beratı |
| YB | berat.xslt | Yevmiye Beratı |
| K | kebir.xslt | Kebir Defteri |
| Y | yevmiye.xslt | Yevmiye Defteri |

## Teknik Detaylar

- **Manifest Version**: 3
- **XSLT İşleme**: Client-side (XSLTProcessor API)
- **PDF Oluşturma**: Chrome Print API
- **Dosya Okuma**: FileReader API
- **Türkçe Karakter Desteği**: Open Sans fontu (Google Fonts)

## Sorun Giderme

### XSLT Uyarısı (crbug.com/435623334)
Chrome, XSLTProcessor kullanımı hakkında bir uyarı gösterebilir. Bu normaldir ve extension şu an için tam fonksiyonel çalışıyor. Bu sadece bir bilgilendirme uyarısıdır ve görmezden gelebilirsiniz. Detaylı bilgi için `NOTES.md` dosyasına bakın.

### Extension yüklenmiyor
- `chrome://extensions/` sayfasında "Geliştirici modu"nun açık olduğundan emin olun
- `extension` klasörünün doğru seçildiğinden emin olun

### XML dosyası otomatik dönüştürülmüyor
- XML dosyasını Chrome'da açtığınızda extension'ın aktif olduğundan emin olun
- `chrome://extensions/` sayfasında extension'ın etkin olduğunu kontrol edin
- Dosya yolunun `file://` protokolü ile açıldığından emin olun
- Eğer çalışmazsa, popup yöntemini kullanabilirsiniz

### XSLT dosyası bulunamadı
- `extension/xslt/` klasöründe tüm XSLT dosyalarının olduğundan emin olun
- Dosya adlarının doğru olduğundan emin olun (küçük harf)

### PDF oluşturulamıyor
- Chrome'un print dialog'unun açıldığından emin olun
- Popup blocker'ın kapalı olduğundan emin olun
- Tarayıcı konsolunda hata mesajlarını kontrol edin (F12)

### Türkçe karakterler görünmüyor
- İnternet bağlantınızın olduğundan emin olun (Google Fonts yüklenmesi için)
- Font yüklemesi için birkaç saniye bekleyin

## Geliştirme

Extension'ı geliştirmek için:

1. `extension` klasöründeki dosyaları düzenleyin
2. `chrome://extensions/` sayfasında extension'ın yanındaki yenile (reload) butonuna tıklayın
3. Değişiklikler otomatik olarak yüklenecektir

## Notlar

- Extension tamamen client-side çalışır, sunucuya veri göndermez
- Tüm işlemler tarayıcıda gerçekleşir
- Dosyalar sadece yerel olarak işlenir, hiçbir veri dışarı gönderilmez
- PDF oluşturma için Chrome'un print dialog'u kullanılır

## Lisans

Bu proje orijinal web uygulaması ile aynı lisans altındadır.
