# eDefter Berat Görüntüleyici

Bu Chrome eklentisi, e-Defter berat XML dosyalarını ve ZIP arşivlerini geniş ekranda görüntülemenizi, önizlemenizi ve PDF olarak indirmenizi sağlar.

## Özellikler

- **Otomatik Görüntüleme**: XML dosyasını Chrome'da açtığınızda belge görüntüleme ekranı otomatik olarak açılır
- Sürükleyip bırakma ile dosya yükleme
- XML ve toplu ZIP dosyaları için popup'tan tam sayfa çalışma ekranına geçiş
- Otomatik dosya türü tespiti (dosya adından ve XML içeriğinden)
- Dosya türü seçimi (DR, KB, YB, K, Y) - otomatik tespit edilen türü manuel olarak değiştirebilirsiniz
- HTML önizleme - PDF oluşturmadan önce görünümü kontrol edin
- PDF indirme - Önizlemeden doğrudan PDF dosyası indirme
- Direkt yazdırma desteği
- Modern ve kullanıcı dostu arayüz

## Kurulum

### 1. Eklentiyi Yükleme

1. Chrome tarayıcınızı açın
2. Adres çubuğuna `chrome://extensions/` yazın ve Enter'a basın
3. Sağ üst köşede "Geliştirici modu" (Developer mode) seçeneğini açın
4. "Paketlenmemiş uzantı yükle" (Load unpacked) butonuna tıklayın
5. `manifest.json` dosyasının bulunduğu proje klasörünü seçin
6. Eklenti yüklenecek ve Chrome araç çubuğunda görünecektir

### 2. Simge Dosyalarını Ekleme (İsteğe Bağlı)

Eklentinin simge dosyalarını eklemek için:

1. Proje kökünde `icons/` klasörü oluşturup aşağıdaki boyutlarda simge dosyaları ekleyin:
   - `icon16.png` (16x16 piksel)
   - `icon48.png` (48x48 piksel)
   - `icon128.png` (128x128 piksel)

2. Simge dosyaları yoksa Chrome varsayılan bir simge gösterir; eklenti yine çalışır.

## Kullanım

### Yöntem 1: Otomatik Görüntüleme (Önerilen)

1. XML dosyanızı Chrome'da açın (dosyaya çift tıklayın veya Chrome'dan File > Open ile açın)
2. Eklenti XML dosyasını otomatik olarak tespit eder
3. Dosya türü otomatik olarak belirlenir
4. Belge görüntüleme ekranı otomatik olarak açılır
5. "PDF İndir" butonuna tıklayarak PDF'i kaydedin veya "Yazdır" butonu ile yazdırın

### Yöntem 2: Popup ile Kullanım

1. Chrome araç çubuğundaki eklenti simgesine tıklayın
2. Açılan popup pencerede XML dosyanızı sürükleyip bırakın veya "XML / ZIP Seç" butonuna tıklayın
3. Dosya normal boyutlu yeni bir tarayıcı sekmesine aktarılır
4. Sistem dosya türünü otomatik tespit eder; gerekirse sol panelden değiştirebilirsiniz
5. Önizleme başlığındaki "PDF İndir" butonuna tıklayın
6. PDF dosyası otomatik olarak indirilecektir

### Yöntem 3: Toplu ZIP ile Kullanım

1. Eklenti penceresini açın
2. ZIP dosyanızı sürükleyip bırakın veya "XML / ZIP Seç" butonunu kullanın
3. ZIP, popup'tan normal boyutlu yeni bir tarayıcı sekmesine aktarılır; dosyayı yeniden seçmeniz gerekmez
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
- **XSLT İşleme**: Tarayıcı içinde, yerel WASM XSLT polyfill ile
- **PDF Oluşturma**: Yerel html2canvas + jsPDF ile doğrudan A4 PDF üretimi
- **Dosya Okuma**: FileReader API
- **ZIP Okuma**: JSZip 3.10.1 (eklenti içinde yerel olarak paketlenmiştir)
- **Türkçe Karakter Desteği**: Open Sans fontu (Google Fonts)

## Sorun Giderme

### XSLT Uyarısı (crbug.com/435623334)
Eklenti, Chrome’un kaldırma planına karşı yerel WASM tabanlı XSLT polyfill’i kullanır. Yeni dönüşümlerde native `XSLTProcessor` uyarısı oluşmamalıdır. Daha önce oluşmuş kayıtlar Chrome’un eklenti hataları ekranında kalabilir; bir kez “Tümünü temizle” ile silinebilir.

### Eklenti yüklenmiyor
- `chrome://extensions/` sayfasında "Geliştirici modu"nun açık olduğundan emin olun
- `manifest.json` dosyasının bulunduğu proje klasörünün doğru seçildiğinden emin olun

### XML dosyası otomatik dönüştürülmüyor
- XML dosyasını Chrome'da açtığınızda eklentinin aktif olduğundan emin olun
- `chrome://extensions/` sayfasında eklentinin etkin olduğunu kontrol edin
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

Eklentiyi geliştirmek için:

1. Proje kökündeki dosyaları düzenleyin
2. `chrome://extensions/` sayfasında eklentinin yanındaki Yenile düğmesine tıklayın
3. Değişiklikler otomatik olarak yüklenecektir

## Notlar

- Eklenti tamamen tarayıcı içinde çalışır, sunucuya veri göndermez
- Tüm işlemler tarayıcıda gerçekleşir
- Dosyalar sadece yerel olarak işlenir, hiçbir veri dışarı gönderilmez
- PDF, tarayıcı yazdırma penceresi açılmadan yerel olarak oluşturulup indirilir. Kanvas ve PDF boyutu doğrulanır; boş çıktı oluşursa indirme başarısız olarak bildirilir.

## Lisans

Bu proje orijinal web uygulaması ile aynı lisans altındadır.
