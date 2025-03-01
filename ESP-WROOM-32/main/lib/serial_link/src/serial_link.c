#include "serial_link.h"

// #include "driver/uart.h"
// #include "string.h"
// #include "driver/gpio.h"
#include "esp_log.h"

static const char* TAG = "serial_link.c";

void test(void)
{
    ESP_LOGI(TAG, "Hello %s", "test");
    AliveStatus test = ALIVE_STATUS__INIT;
    void *buf;
    unsigned len;

    test.data=420;

    len = alive_status__get_packed_size(&test);
    buf = malloc(len);
    alive_status__pack(&test, buf);
    
	ESP_LOGI(TAG, "Writing %d serialized bytes",len); // See the length of message
	ESP_LOG_BUFFER_HEXDUMP(TAG, buf, len, ESP_LOG_INFO); // Write to stdout to allow direct command line piping

    ESP_LOGI(TAG, "start");
    
	// Unpack the message using protobuf-c.
	AliveStatus *msg2;
	msg2 = alive_status__unpack(NULL, len, buf);
	if (msg2 == NULL) {
    	ESP_LOGE(TAG, "error unpacking incoming message");
	}

	// display the message's fields.
	ESP_LOGI(TAG, "deserialize: data=%"PRIi32, msg2->data);  // required field
 	if (msg2->signage) { // handle optional field
    	ESP_LOGI(TAG, "deserialize: signage=%s", msg2->signage);
	} 

	// Free the allocated serialized buffer
	free(buf);

	// Free the allocated deserialized buffer
	alive_status__free_unpacked(msg2, NULL);
}

// static const int RX_BUF_SIZE = 1024;

// #define TXD_PIN (GPIO_NUM_17)
// #define RXD_PIN (GPIO_NUM_16)

// void init(void) {
//     const uart_config_t uart_config = {
//         .baud_rate = 115200,
//         .data_bits = UART_DATA_8_BITS,
//         .parity = UART_PARITY_DISABLE,
//         .stop_bits = UART_STOP_BITS_1,
//         .flow_ctrl = UART_HW_FLOWCTRL_DISABLE,
//         .source_clk = UART_SCLK_APB,
//     };
//     // We won't use a buffer for sending data.
//     uart_driver_install(UART_NUM_1, RX_BUF_SIZE * 2, 0, 0, NULL, 0);
//     uart_param_config(UART_NUM_1, &uart_config);
//     uart_set_pin(UART_NUM_1, TXD_PIN, RXD_PIN, UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE);
// }

// int sendData(const char* logName, const char* data)
// {
//     const int len = strlen(data);
//     const int txBytes = uart_write_bytes(UART_NUM_1, data, len);
//     ESP_LOGI(logName, "Wrote %d bytes", txBytes);
//     return txBytes;
// }

// static void tx_task(void *arg)
// {
//     bool swap = true;
//     static const char *TX_TASK_TAG = "TX_TASK";
//     esp_log_level_set(TX_TASK_TAG, ESP_LOG_INFO);
//     while (1) {
//         if(swap) {
//             sendData(TX_TASK_TAG, "YHello!\0");
//         }
//         else{
//             sendData(TX_TASK_TAG, "N\0");
//         }
//         swap = !swap;
//         vTaskDelay(2000 / portTICK_PERIOD_MS);
//     }
// }

// static void rx_task(void *arg)
// {
//     static const char *RX_TASK_TAG = "RX_TASK";
//     esp_log_level_set(RX_TASK_TAG, ESP_LOG_INFO);
//     uint8_t* data = (uint8_t*) malloc(RX_BUF_SIZE + 1);
//     while (1) {
//         const int rxBytes = uart_read_bytes(UART_NUM_1, data, RX_BUF_SIZE, 1000 / portTICK_PERIOD_MS);
//         if (rxBytes > 0) {
//             data[rxBytes] = 0;
//             ESP_LOGI(RX_TASK_TAG, "Read %d bytes: '%s'", rxBytes, (char *)data);
//             // ESP_LOG_BUFFER_HEXDUMP(RX_TASK_TAG, data, rxBytes, ESP_LOG_INFO);
//         }
//     }
//     free(data);
// }

// void app_main(void)
// {
//     init();
//     xTaskCreate(rx_task, "uart_rx_task", 1024 * 2, NULL, configMAX_PRIORITIES - 1, NULL);
//     xTaskCreate(tx_task, "uart_tx_task", 1024 * 2, NULL, configMAX_PRIORITIES - 2, NULL);
// }
