!macro NSIS_HOOK_POSTINSTALL
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.xml\shell\BeratGoruntuleyici" "" "Berat Görüntüleyici ile aç"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.xml\shell\BeratGoruntuleyici" "Icon" "$INSTDIR\${MAINBINARYNAME}.exe,0"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.xml\shell\BeratGoruntuleyici\command" "" '"$INSTDIR\${MAINBINARYNAME}.exe" "%1"'
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.zip\shell\BeratGoruntuleyici" "" "Berat Görüntüleyici ile aç"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.zip\shell\BeratGoruntuleyici" "Icon" "$INSTDIR\${MAINBINARYNAME}.exe,0"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.zip\shell\BeratGoruntuleyici\command" "" '"$INSTDIR\${MAINBINARYNAME}.exe" "%1"'
  WriteRegStr HKCU "Software\Classes\BeratGoruntuleyici.xml" "" "eDefter Berat Görüntüleyici"
  WriteRegStr HKCU "Software\Classes\BeratGoruntuleyici.xml\DefaultIcon" "" "$INSTDIR\${MAINBINARYNAME}.exe,0"
  WriteRegStr HKCU "Software\Classes\BeratGoruntuleyici.xml\shell\open\command" "" '"$INSTDIR\${MAINBINARYNAME}.exe" "%1"'
  WriteRegStr HKCU "Software\Classes\BeratGoruntuleyici.zip" "" "eDefter Berat Görüntüleyici"
  WriteRegStr HKCU "Software\Classes\BeratGoruntuleyici.zip\DefaultIcon" "" "$INSTDIR\${MAINBINARYNAME}.exe,0"
  WriteRegStr HKCU "Software\Classes\BeratGoruntuleyici.zip\shell\open\command" "" '"$INSTDIR\${MAINBINARYNAME}.exe" "%1"'
  WriteRegStr HKCU "Software\Classes\.xml\OpenWithProgids" "BeratGoruntuleyici.xml" ""
  WriteRegStr HKCU "Software\Classes\.zip\OpenWithProgids" "BeratGoruntuleyici.zip" ""
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\.xml\shell\BeratGoruntuleyici"
  DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\.zip\shell\BeratGoruntuleyici"
  DeleteRegKey HKCU "Software\Classes\BeratGoruntuleyici.xml"
  DeleteRegKey HKCU "Software\Classes\BeratGoruntuleyici.zip"
  DeleteRegValue HKCU "Software\Classes\.xml\OpenWithProgids" "BeratGoruntuleyici.xml"
  DeleteRegValue HKCU "Software\Classes\.zip\OpenWithProgids" "BeratGoruntuleyici.zip"
!macroend
