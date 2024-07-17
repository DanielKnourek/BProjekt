#include "uart_link.h"

// general include
#include "esp_log.h"
#include "freertos/FreeRTOS.h"

// handler specific
#include "driver/gpio.h"
#include "driver/uart.h"

#define UART_GPIO_RX (CONFIG_UART_GPIO_RX)
#define UART_GPIO_TX (CONFIG_UART_GPIO_TX)

#define UART_BAUD (CONFIG_UART_BAUD)
#define UART_PACKET_SIZE sizeof(uint32_t)
#define UART_PACKET_QUEUE_SIZE 5

static const char* TAG = "UART LINK";
const uart_port_t uart_num = CONFIG_UART_NUM;

uart_config_t uart_config = {
    .baud_rate = UART_BAUD,
    .data_bits = UART_DATA_8_BITS,
    .parity = UART_PARITY_DISABLE,
    .stop_bits = UART_STOP_BITS_1,
    .flow_ctrl = UART_HW_FLOWCTRL_CTS_RTS,
    .rx_flow_ctrl_thresh = 122,
};

QueueHandle_t uart_queue;

esp_err_t uart_init() {
    ESP_ERROR_CHECK(uart_param_config(uart_num, &uart_config));
    ESP_ERROR_CHECK(uart_set_pin(uart_num, UART_GPIO_TX, UART_GPIO_RX,
                                 UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE));
    // Setup UART buffered IO with event queue
    const int uart_buffer_size = (UART_PACKET_SIZE * UART_PACKET_QUEUE_SIZE);

    // Install UART driver using an event queue here
    ESP_ERROR_CHECK(uart_driver_install(uart_num, uart_buffer_size,
                                        uart_buffer_size, 10, &uart_queue, 0));
    return ESP_OK;
}


void uart_link_init() {
    ESP_LOGI(TAG, "UART link initialization.");
    uart_init();
}