#include "serial_link.h"

#include "driver/uart.h"
// #include "driver/gpio.h"
// #include "string.h"
#include "esp_log.h"

static const char *TAG = "serial_link.c";

static const int RX_BUF_SIZE = 128;

#define TXD_PIN (CONFIG_UART_GPIO_TX)
#define RXD_PIN (CONFIG_UART_GPIO_RX)

void init(void) {
    const uart_config_t uart_config = {
        .baud_rate = 115200,
        .data_bits = UART_DATA_8_BITS,
        .parity = UART_PARITY_DISABLE,
        .stop_bits = UART_STOP_BITS_1,
        .flow_ctrl = UART_HW_FLOWCTRL_DISABLE,
        .source_clk = UART_SCLK_APB,
    };
    // We won't use a buffer for sending data.
    uart_driver_install(UART_NUM_1, RX_BUF_SIZE * 2, 0, 0, NULL, 0);
    uart_param_config(UART_NUM_1, &uart_config);
    uart_set_pin(UART_NUM_1, TXD_PIN, RXD_PIN, UART_PIN_NO_CHANGE,
                 UART_PIN_NO_CHANGE);
}

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
void deserialize(uint8_t *data) {
    // deserialize pb
    MessageID *msg2 = MESSAGE_ID__INIT;
    unsigned len;

    len = message_id__get_packed_size(&msg2);

    msg2 = message_id__unpack(NULL, len, data);
    // if (msg2 == NULL) {
    //     ESP_LOGE(TAG, "error unpacking incoming message_id__unpack");
    //     return;
    // }

    // display the message's fields.
    ESP_LOGI(TAG, "deserialize: id=%d" PRIi32,
             msg2->id);  // required field

    // Free the allocated deserialized buffer
    message_id__free_unpacked(msg2, NULL);

    Link1Data *msgdata1 = LINK1_DATA__INIT;
    unsigned len_data1;
    len_data1 = link1_data__get_packed_size(&msgdata1);

    msgdata1 = link1_data__unpack(NULL, len_data1, data);
    // if (msgdata1 == NULL) {
    //     ESP_LOGE(TAG, "error unpacking incoming link1_data__unpack");
    //     return;
    // }

    // display the message's fields.
    ESP_LOGI(TAG, "deserialize data: id=%d; data:%d" PRIi32, msgdata1->id,
             (int)msgdata1->sensor_data);
}
static void rx_task(void *arg) {
    static const char *RX_TASK_TAG = "RX_TASK";
    esp_log_level_set(RX_TASK_TAG, ESP_LOG_INFO);
    uint8_t *data = (uint8_t *)malloc(RX_BUF_SIZE + 1);
    while (1) {
        const int rxBytes = uart_read_bytes(UART_NUM_1, data, RX_BUF_SIZE,
                                            1000 / portTICK_PERIOD_MS);
        if (rxBytes > 0) {
            data[rxBytes] = 0;
            ESP_LOGI(RX_TASK_TAG, "Read %d bytes: '%s'", rxBytes, (char *)data);
            ESP_LOG_BUFFER_HEXDUMP(RX_TASK_TAG, data, rxBytes, ESP_LOG_INFO);

            deserialize(data);
        }
    }
    free(data);
}

void uart_init(void) {
    init();
    xTaskCreate(rx_task, "uart_rx_task", 1024 * 2, NULL,
                configMAX_PRIORITIES - 1, NULL);
    // xTaskCreate(tx_task, "uart_tx_task", 1024 * 2, NULL,
    //             configMAX_PRIORITIES - 2, NULL);
}

void test(void) {
    uart_init();

    // ESP_LOGI(TAG, "Hello %s", "test");
    // MessageID msgID = MESSAGE_ID__INIT;
    // void *buf;
    // unsigned len;

    // msgID.id = MESSAGE_TYPE__ALIVE_CHECK;

    // len = message_id__get_packed_size(&msgID);
    // buf = malloc(len);
    // message_id__pack(&msgID, buf);

    // ESP_LOGI(TAG, "Writing %d serialized bytes",
    //          len);  // See the length of message
    // ESP_LOG_BUFFER_HEXDUMP(
    //     TAG, buf, len,
    //     ESP_LOG_INFO);  // Write to stdout to allow direct command line
    //     piping

    // ESP_LOGI(TAG, "start");

    // // Unpack the message using protobuf-c.
    // MessageID *msg2;
    // msg2 = message_id__unpack(NULL, len, buf);
    // if (msg2 == NULL) {
    //     ESP_LOGE(TAG, "error unpacking incoming message");
    // }

    // // display the message's fields.
    // ESP_LOGI(TAG, "deserialize: data=%d" PRIi32, msg2->id);  // required
    // field

    // // Free the allocated serialized buffer
    // free(buf);

    // // Free the allocated deserialized buffer
    // message_id__free_unpacked(msg2, NULL);
}
