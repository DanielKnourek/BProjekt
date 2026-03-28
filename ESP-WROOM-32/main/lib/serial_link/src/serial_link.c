#include "serial_link.h"

#include "driver/uart.h"
// #include "driver/gpio.h"
// #include "string.h"
#include "esp_log.h"
#include <string.h>

static const char* TAG = "serial_link.c";

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
void deserialize(uint8_t* data, size_t len) {
    // deserialize pb
    //  -- read MessageID FIRST to know the type of message, then read the rest
    //  of the data accordingly --
    
    unsigned len_id1 = message_id__get_packed_size(&(MessageID)MESSAGE_ID__INIT);
    MessageID* msg_id = message_id__unpack(NULL, len_id1, data);
    if (msg_id == NULL) {
        ESP_LOGE(TAG, "error unpacking incoming message_id__unpack");
        return;
    }

    // size_t len_id1 = message_id__get_packed_size(msg_id);

    // display the message's fields.
    ESP_LOGI(TAG, "deserialize: id=%d" PRIi32,
             msg_id->id);  // required field

    if (msg_id->id == MESSAGE_TYPE__LINK1_DATA) {
        if (len <= len_id1) {
            ESP_LOGE(TAG, "Not enough data for Link1Data");
            message_id__free_unpacked(msg_id, NULL);
            return;
        }

            uint8_t aligned_log_buffer[128];

            // 2. Calculate the length of the data we want to log.
            size_t log_len = len - len_id1;

            // // 3. To be safe, make sure we don't copy more data than our temp buffer can hold.
            if (log_len > sizeof(aligned_log_buffer)) {
                ESP_LOGW(TAG, "Log data is too large for temp buffer, truncating from %d to %d bytes.", log_len, sizeof(aligned_log_buffer));
                // log_len = sizeof(aligned_log_buffer);
            }


            // 4. Copy the (potentially unaligned) data slice into our (definitely aligned) temp buffer.
            memcpy(aligned_log_buffer, data + len_id1, log_len);
            

            // 5. Now, call the hexdump function with the aligned buffer. This should work.
            ESP_LOGI(TAG, "Dumping buffer from aligned temporary copy:");
            ESP_LOG_BUFFER_HEXDUMP(TAG, aligned_log_buffer, log_len, ESP_LOG_INFO);


        Link1Data* msg_data1 =
            link1_data__unpack(NULL, len - len_id1, data + len_id1);
        if (msg_data1 == NULL) {
            ESP_LOGE(TAG, "error unpacking incoming link1_data__unpack");
            message_id__free_unpacked(msg_id, NULL);
            return;
        }

        // display the message's fields.
        ESP_LOGI(TAG, "deserialize data: id=%d; data:%d" PRIi32, msg_data1->id,
                 (int)msg_data1->sensor_data);

        // Free the allocated deserialized buffer
        link1_data__free_unpacked(msg_data1, NULL);
    }

    // Free the allocated deserialized buffer
    message_id__free_unpacked(msg_id, NULL);
}
static void rx_task(void* arg) {
    static const char* RX_TASK_TAG = "RX_TASK";
    esp_log_level_set(RX_TASK_TAG, ESP_LOG_INFO);
    uint8_t* data = (uint8_t*)malloc(RX_BUF_SIZE + 1);
    while (1) {
        const int rxBytes = uart_read_bytes(UART_NUM_1, data, RX_BUF_SIZE,
                                            1000 / portTICK_PERIOD_MS);
        if (rxBytes > 0) {
            data[rxBytes] = 0;
            ESP_LOGI(RX_TASK_TAG, "Read %d bytes: '%s' |1ca5c|", rxBytes, (char*)data);
            ESP_LOG_BUFFER_HEXDUMP(RX_TASK_TAG, data, rxBytes, ESP_LOG_INFO);

            // TODO: TEMP struct to test serialization bytes
            Link1Data msgdata = LINK1_DATA__INIT;
            msgdata.id = MESSAGE_TYPE__LINK1_DATA;
            msgdata.sensor_data = 69;

            unsigned len = link1_data__get_packed_size(&msgdata);
            uint8_t* buf = (uint8_t*)malloc(32);
            if (buf != NULL) {
                memset(buf, 0, 32);
            }

            // test BEGIN
            link1_data__pack(&msgdata, buf);
            ESP_LOGI(RX_TASK_TAG, "Serialized MessageID of length %d bytes", len);
            ESP_LOG_BUFFER_HEXDUMP(RX_TASK_TAG, buf, 32, ESP_LOG_INFO);

            Link1Data* msg_data2;
            msg_data2 = link1_data__unpack(NULL, 4, buf);
            if (msg_data2 == NULL) {
                ESP_LOGE(RX_TASK_TAG, "error unpacking incoming link1_data__unpack");
                
            } else {

                // ESP_LOGI(RX_TASK_TAG, "Serialized msg_data2 of length %d bytes", 32);
                ESP_LOGI(RX_TASK_TAG, "Deserialized msg_data2: id=%d; data:%d" PRIi32, msg_data2->id,
                    (int)msg_data2->sensor_data);
            }
                    // test END
            
            // deserialize(data, rxBytes);
            
            free(buf);
        }
    }
    free(data);
}

void uart_init(void) {
    init();
    // TODO: document, there was not enough memory for the task
    xTaskCreate(rx_task, "uart_rx_task", 1024 * 4, NULL,
                configMAX_PRIORITIES - 1, NULL);
    // xTaskCreate(rx_task, "uart_rx_task", 1024 * 2, NULL,
    //             configMAX_PRIORITIES - 1, NULL);
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
    // MessageID *msgID;
    // msgID = message_id__unpack(NULL, len, buf);
    // if (msgID == NULL) {
    //     ESP_LOGE(TAG, "error unpacking incoming message");
    // }

    // // display the message's fields.
    // ESP_LOGI(TAG, "deserialize: data=%d" PRIi32, msgID->id);  // required
    // field

    // // Free the allocated serialized buffer
    // free(buf);

    // // Free the allocated deserialized buffer
    // message_id__free_unpacked(msgID, NULL);
}
