# Enable compile command to ease indexing with e.g. clangd
set(CMAKE_EXPORT_COMPILE_COMMANDS TRUE)

# Compiler options
target_compile_options(${BUILD_UNIT_0_NAME} PRIVATE
    $<$<COMPILE_LANGUAGE:C>: -mfpu=fpv5-sp-d16 -mfloat-abi=hard -mthumb --specs=nano.specs -mcpu=cortex-m7 -std=gnu11 -g3 -DDEBUG -DUSE_HAL_DRIVER -DSTM32F746xx -O0 -ffunction-sections -fdata-sections -Wall -fstack-usage>
    $<$<COMPILE_LANGUAGE:CXX>: -mfpu=fpv5-sp-d16 -mfloat-abi=hard -mthumb --specs=nano.specs -mcpu=cortex-m7 -std=gnu++14 -g3 -O0 -ffunction-sections -fdata-sections -fno-exceptions -fno-rtti -fno-use-cxa-atexit -Wall -fstack-usage>
    $<$<COMPILE_LANGUAGE:ASM>: ${CUBE_CMAKE_ASM_FLAGS}>
)

# Linker options
target_link_options(${BUILD_UNIT_0_NAME} PRIVATE ${CUBE_CMAKE_EXE_LINKER_FLAGS})

# Add sources to executable/library
target_sources(${BUILD_UNIT_0_NAME} PRIVATE
    "Core/Src/main.c"
    "Core/Src/stm32f7xx_hal_msp.c"
    "Core/Src/stm32f7xx_hal_timebase_tim.c"
    "Core/Src/stm32f7xx_it.c"
    "Core/Src/syscalls.c"
    "Core/Src/sysmem.c"
    "Core/Src/system_stm32f7xx.c"
    "Core/Startup/startup_stm32f746nghx.s"
    "Drivers/STM32F7xx_HAL_Driver/Src/stm32f7xx_hal.c"
    "Drivers/STM32F7xx_HAL_Driver/Src/stm32f7xx_hal_adc.c"
    "Drivers/STM32F7xx_HAL_Driver/Src/stm32f7xx_hal_adc_ex.c"
    "Drivers/STM32F7xx_HAL_Driver/Src/stm32f7xx_hal_cortex.c"
    "Drivers/STM32F7xx_HAL_Driver/Src/stm32f7xx_hal_crc.c"
    "Drivers/STM32F7xx_HAL_Driver/Src/stm32f7xx_hal_crc_ex.c"
    "Drivers/STM32F7xx_HAL_Driver/Src/stm32f7xx_hal_dcmi.c"
    "Drivers/STM32F7xx_HAL_Driver/Src/stm32f7xx_hal_dcmi_ex.c"
    "Drivers/STM32F7xx_HAL_Driver/Src/stm32f7xx_hal_dma.c"
    "Drivers/STM32F7xx_HAL_Driver/Src/stm32f7xx_hal_dma2d.c"
    "Drivers/STM32F7xx_HAL_Driver/Src/stm32f7xx_hal_dma_ex.c"
    "Drivers/STM32F7xx_HAL_Driver/Src/stm32f7xx_hal_dsi.c"
    "Drivers/STM32F7xx_HAL_Driver/Src/stm32f7xx_hal_eth.c"
    "Drivers/STM32F7xx_HAL_Driver/Src/stm32f7xx_hal_exti.c"
    "Drivers/STM32F7xx_HAL_Driver/Src/stm32f7xx_hal_flash.c"
    "Drivers/STM32F7xx_HAL_Driver/Src/stm32f7xx_hal_flash_ex.c"
    "Drivers/STM32F7xx_HAL_Driver/Src/stm32f7xx_hal_gpio.c"
    "Drivers/STM32F7xx_HAL_Driver/Src/stm32f7xx_hal_hcd.c"
    "Drivers/STM32F7xx_HAL_Driver/Src/stm32f7xx_hal_i2c.c"
    "Drivers/STM32F7xx_HAL_Driver/Src/stm32f7xx_hal_i2c_ex.c"
    "Drivers/STM32F7xx_HAL_Driver/Src/stm32f7xx_hal_ltdc.c"
    "Drivers/STM32F7xx_HAL_Driver/Src/stm32f7xx_hal_ltdc_ex.c"
    "Drivers/STM32F7xx_HAL_Driver/Src/stm32f7xx_hal_pwr.c"
    "Drivers/STM32F7xx_HAL_Driver/Src/stm32f7xx_hal_pwr_ex.c"
    "Drivers/STM32F7xx_HAL_Driver/Src/stm32f7xx_hal_qspi.c"
    "Drivers/STM32F7xx_HAL_Driver/Src/stm32f7xx_hal_rcc.c"
    "Drivers/STM32F7xx_HAL_Driver/Src/stm32f7xx_hal_rcc_ex.c"
    "Drivers/STM32F7xx_HAL_Driver/Src/stm32f7xx_hal_rtc.c"
    "Drivers/STM32F7xx_HAL_Driver/Src/stm32f7xx_hal_rtc_ex.c"
    "Drivers/STM32F7xx_HAL_Driver/Src/stm32f7xx_hal_sai.c"
    "Drivers/STM32F7xx_HAL_Driver/Src/stm32f7xx_hal_sai_ex.c"
    "Drivers/STM32F7xx_HAL_Driver/Src/stm32f7xx_hal_sdram.c"
    "Drivers/STM32F7xx_HAL_Driver/Src/stm32f7xx_hal_spdifrx.c"
    "Drivers/STM32F7xx_HAL_Driver/Src/stm32f7xx_hal_tim.c"
    "Drivers/STM32F7xx_HAL_Driver/Src/stm32f7xx_hal_tim_ex.c"
    "Drivers/STM32F7xx_HAL_Driver/Src/stm32f7xx_hal_uart.c"
    "Drivers/STM32F7xx_HAL_Driver/Src/stm32f7xx_hal_uart_ex.c"
    "Drivers/STM32F7xx_HAL_Driver/Src/stm32f7xx_ll_fmc.c"
    "Drivers/STM32F7xx_HAL_Driver/Src/stm32f7xx_ll_usb.c"
    "Lib/flag_tools/flag_tools.c"
    "Lib/nanopb/messenger.pb.c"
    "Lib/nanopb/pb_common.c"
    "Lib/nanopb/pb_decode.c"
    "Lib/nanopb/pb_encode.c"
    "Middlewares/ST/STM32_USB_Host_Library/Class/CDC/Src/usbh_cdc.c"
    "Middlewares/ST/STM32_USB_Host_Library/Core/Src/usbh_core.c"
    "Middlewares/ST/STM32_USB_Host_Library/Core/Src/usbh_ctlreq.c"
    "Middlewares/ST/STM32_USB_Host_Library/Core/Src/usbh_ioreq.c"
    "Middlewares/ST/STM32_USB_Host_Library/Core/Src/usbh_pipes.c"
    "USB_HOST/App/usb_host.c"
    "USB_HOST/Target/usbh_conf.c"
    "USB_HOST/Target/usbh_platform.c"
)

target_include_directories(${BUILD_UNIT_0_NAME} PRIVATE
    "Core/Inc"
    "USB_HOST/App"
    "USB_HOST/Target"
    "Drivers/STM32F7xx_HAL_Driver/Inc"
    "Drivers/STM32F7xx_HAL_Driver/Inc/Legacy"
    "Middlewares/ST/STM32_USB_Host_Library/Core/Inc"
    "Middlewares/ST/STM32_USB_Host_Library/Class/CDC/Inc"
    "Drivers/CMSIS/Device/ST/STM32F7xx/Include"
    "Drivers/CMSIS/Include"
    "orkspace/STM32F746-DISCO/Lib/flag_tools&quot;"
    "orkspace/STM32F746-DISCO/Lib/nanopb&quot;"
)

configure_file("${CMAKE_SOURCE_DIR}/STM32F746NGHX_FLASH.ld" "${CMAKE_BINARY_DIR}" COPYONLY)

set_target_properties(${BUILD_UNIT_0_NAME} PROPERTIES LINK_DEPENDS "STM32F746NGHX_FLASH.ld")

