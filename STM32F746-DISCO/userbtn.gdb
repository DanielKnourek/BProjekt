interrupt
shell timeout /t 1 /nobreak > nul
enable 5
continue
call set_flag(&Flags, FT_BTN1)
disable 5
continue