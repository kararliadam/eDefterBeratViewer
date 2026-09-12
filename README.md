# XML Berat PDF Dönüştürücü - Chrome Extension

Bu Chrome Extension, e-defter berat XML dosyalarını PDF formatına dönüştürmenizi sağlar. Web uygulamasının tüm özelliklerini tarayıcı uzantısı olarak kullanabilirsiniz.

## Özellikler

- **Otomatik Dönüştürme**: XML dosyasını Chrome'da açtığınızda otomatik olarak PDF görünümüne dönüştürülür
- Drag & Drop dosya yükleme
- XML ve toplu ZIP dosyaları için popup'tan tam sayfa çalışma ekranına geçiş
- Otomatik dosya türü tespiti (dosya adından ve XML içeriğinden)
- Dosya türü seçimi (DR, KB, YB, K, Y) - otomatik tespit edilen türü manuel olarak değiştirebilirsiniz
- HTML önizleme - PDF oluşturmadan önce görünümü kontrol edin
- PDF indirme - Önizlemeden doğrudan PDF dosyası indirme
- Direkt yazdırma desteği
- Modern ve kullanıcı dostu arayüz

## Kurulum

### 1. Extension'ı Yükleme

1. Chrome tarayıcınızı açın
2. Adres çubuğuna `chrome://extensions/` yazın ve Enter'a basın
3. Sağ üst köşede "Geliştirici modu" (Developer mode) seçeneğini açın
4. "Paketlenmemiş uzantı yükle" (Load unpacked) butonuna tıklayın
5. `manifest.json` dosyasının bulunduğu proje klasörünü seçin
6. Extension yüklenecek ve Chrome toolbar'ında görünecektir

### 2. Icon Dosyalarını Ekleme (Opsiyonel)

Extension'ın icon dosyalarını eklemek için:

1. Proje kökünde `icons/` klasörü oluşturup aşağıdaki boyutlarda icon dosyaları ekleyin:
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
2. Açılan popup pencerede XML dosyanızı sürükleyip bırakın veya "XML / ZIP Seç" butonuna tıklayın
3. Dosya normal boyutlu yeni bir uzantı sekmesine aktarılır
4. Sistem dosya türünü otomatik tespit eder; gerekirse sol panelden değiştirebilirsiniz
5. Önizleme başlığındaki "PDF İndir" butonuna tıklayın
6. PDF dosyası otomatik olarak indirilecektir

### Yöntem 3: Toplu ZIP ile Kullanım

1. Extension popup'ını açın
2. ZIP dosyanızı sürükleyip bırakın veya "XML / ZIP Seç" butonunu kullanın
3. ZIP, popup'tan normal boyutlu yeni bir uzantı sekmesine aktarılır; dosyayı yeniden seçmeniz gerekmez
4. ZIP'in klasörlerindeki ve en fazla 3 seviye iç içe ZIP'lerdeki XML dosyaları listelenir
5. Belge türü (DR, K, KB, Y, YB) ve dönem tarihi filtreleriyle listeyi daraltın
6. Listeden bir XML'e tıklayarak türünü ve önizlemesini görüntüleyin
7. Seçili XML'i önizleme başlığındaki "PDF İndir" butonuyla doğrudan PDF olarak indirin

Güvenli ve akıcı kullanım için ZIP boyutu 50 MB, her XML dosyası 10 MB ve arşiv başına liste 500 XML ile sınırlıdır. Şifreli ZIP dosyaları desteklenmez.

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
- **XSLT İşleme**: Client-side (yerel WASM XSLT polyfill)
- **PDF Oluşturma**: Yerel html2canvas + jsPDF ile doğrudan A4 PDF üretimi
- **Dosya Okuma**: FileReader API
- **ZIP Okuma**: JSZip 3.10.1 (extension içinde yerel olarak paketlenmiştir)
- **Türkçe Karakter Desteği**: Open Sans fontu (Google Fonts)

## Sorun Giderme

### XSLT Uyarısı (crbug.com/435623334)
Eklenti, Chrome’un kaldırma planına karşı yerel WASM tabanlı XSLT polyfill’i kullanır. Yeni dönüşümlerde native `XSLTProcessor` uyarısı oluşmamalıdır. Daha önce oluşmuş kayıtlar Chrome’un eklenti hataları ekranında kalabilir; bir kez “Tümünü temizle” ile silinebilir.

### Extension yüklenmiyor
- `chrome://extensions/` sayfasında "Geliştirici modu"nun açık olduğundan emin olun
- `manifest.json` dosyasının bulunduğu proje klasörünün doğru seçildiğinden emin olun

### XML dosyası otomatik dönüştürülmüyor
- XML dosyasını Chrome'da açtığınızda extension'ın aktif olduğundan emin olun
- `chrome://extensions/` sayfasında extension'ın etkin olduğunu kontrol edin
- Dosya yolunun `file://` protokolü ile açıldığından emin olun
- Eğer çalışmazsa, popup yöntemini kullanabilirsiniz

### XSLT dosyası bulunamadı
- `xslt/` klasöründe tüm XSLT dosyalarının olduğundan emin olun
- Dosya adlarının doğru olduğundan emin olun (küçük harf)

### PDF oluşturulamıyor
- Eklentiyi `chrome://extensions/` üzerinden yenileyip tekrar deneyin
- İndirilenler klasöründe dosyanın oluştuğunu kontrol edin
- Tarayıcı konsolunda hata mesajlarını kontrol edin (F12)

### Türkçe karakterler görünmüyor
- İnternet bağlantınızın olduğundan emin olun (Google Fonts yüklenmesi için)
- Font yüklemesi için birkaç saniye bekleyin

## Geliştirme

Extension'ı geliştirmek için:

1. Proje kökündeki dosyaları düzenleyin
2. `chrome://extensions/` sayfasında extension'ın yanındaki yenile (reload) butonuna tıklayın
3. Değişiklikler otomatik olarak yüklenecektir

## Notlar

- Extension tamamen client-side çalışır, sunucuya veri göndermez
- Tüm işlemler tarayıcıda gerçekleşir
- Dosyalar sadece yerel olarak işlenir, hiçbir veri dışarı gönderilmez
- PDF, tarayıcı yazdırma penceresi açılmadan yerel olarak oluşturulup indirilir. Kanvas ve PDF boyutu doğrulanır; boş çıktı oluşursa indirme başarısız olarak bildirilir.

## Lisans

Bu proje orijinal web uygulaması ile aynı lisans altındadır.
