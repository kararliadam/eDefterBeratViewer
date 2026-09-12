# Önemli Notlar

## XSLT Uyarısı Hakkında

Chrome native `XSLTProcessor` API'sini kullanımdan kaldırıyor. Eklenti artık bu API'yi doğrudan çağırmıyor; `vendor/xslt-polyfill.min.js` içindeki yerel WASM tabanlı polyfill'i dönüşümden hemen önce yükleyip kullanıyor.

Bu nedenle yeni XML dönüşümlerinde `crbug.com/435623334` uyarısı oluşmamalıdır. Polyfill, XSLT 1.0 uyumluluğunu korur ve eklentinin dış ağdan kod yüklemesini gerektirmez. Daha önce oluşmuş Chrome eklenti hata kayıtları otomatik silinmez; Chrome'daki “Tümünü temizle” düğmesiyle temizlenebilir.
