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
    // We won't use a buf_header for sending data.
    uart_driver_install(UART_NUM_1, RX_BUF_SIZE * 2, 0, 0, NULL, 0);
    uart_param_config(UART_NUM_1, &uart_config);
    uart_set_pin(UART_NUM_1, TXD_PIN, RXD_PIN, UART_PIN_NO_CHANGE,
                 UART_PIN_NO_CHANGE);
}

// int sendData(const char* logName, const char* data)
// {
//     const int len_payload = strlen(data);
//     const int txBytes = uart_write_bytes(UART_NUM_1, data, len_payload);
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
void deserialize(uint8_t* data, size_t len_payload) {
    // deserialize pb
    //  -- read MessageID FIRST to know the type of message, then read the rest
    //  of the data accordingly --
    
    unsigned len_header = frame_header__get_packed_size(&(FrameHeader)FRAME_HEADER__INIT);
    // FrameHeader* msg_header = message_id__unpack(NULL, len_header, data);
    FrameHeader* msg_header = frame_header__unpack(NULL, len_header, data);
    if (msg_header == NULL) {
        ESP_LOGE(TAG, "error unpacking incoming message_id__unpack");
        return;
    }

    // display the message's fields.
    ESP_LOGI(TAG, "deserialize header: id=%d; data:%d" PRIi32, 
            (int)msg_header->next_message_size,
             (int)msg_header->crc);

        if (len_payload <= len_header && len_header + msg_header->next_message_size > len_payload) {
            ESP_LOGE(TAG, "Not enough data for FramePayload");
            frame_header__free_unpacked(msg_header, NULL);
            return;
        }

        uint8_t aligned_log_buffer[128];

        // 2. Calculate the length of the data we want to log.
        size_t log_len = len_payload - len_header;

        // // 3. To be safe, make sure we don't copy more data than our temp buf_header can hold.
        if (log_len > sizeof(aligned_log_buffer)) {
            ESP_LOGW(TAG, "Log data is too large for temp buf_header, truncating from %d to %d bytes.", log_len, sizeof(aligned_log_buffer));
            // log_len = sizeof(aligned_log_buffer);
        }

        // 4. Copy the (potentially unaligned) data slice into our (definitely aligned) temp buf_header.
        memcpy(aligned_log_buffer, data + len_header, log_len);
        

        // 5. Now, call the hexdump function with the aligned buf_header. This should work.
        ESP_LOGI(TAG, "Dumping buf_header from aligned temporary copy:");
        ESP_LOG_BUFFER_HEXDUMP(TAG, aligned_log_buffer, log_len, ESP_LOG_INFO);

        FramePayload* msg_payload =
            frame_payload__unpack(NULL, msg_header->next_message_size, data + len_header);
        if (msg_payload == NULL) {
            ESP_LOGE(TAG, "error unpacking incoming link1_data__unpack");
            frame_header__free_unpacked(msg_header, NULL);
            return;
        }

    // display the message's fields.
    ESP_LOGI(TAG, "deserialize data: data:%d" PRIi32,
             (int)msg_payload->test1_data->test_data);

    // Free the allocated deserialized buf_header
    frame_header__free_unpacked(msg_header, NULL);
    frame_payload__free_unpacked(msg_payload, NULL);

}

void test_pack(void){
    static const char* TEST_TAG = "PACK_TEST";
    // TODO: TEMP struct to test serialization bytes
    Test1Data test1_data = TEST1_DATA__INIT;
    test1_data.test_data = 12345;

    FramePayload msg_payload = FRAME_PAYLOAD__INIT;
    msg_payload.payload_case = FRAME_PAYLOAD__PAYLOAD_TEST1_DATA;
    msg_payload.test1_data = &test1_data;

    unsigned len_payload = frame_payload__get_packed_size(&msg_payload);
    uint8_t* buf_payload = (uint8_t*)malloc(32);
    if (buf_payload != NULL) {
        memset(buf_payload, 0, 32);
    }

    // test BEGIN
    frame_payload__pack(&msg_payload, buf_payload);
    ESP_LOGI(TEST_TAG, "Serialized FramePayload of length %d bytes", len_payload);
    ESP_LOG_BUFFER_HEXDUMP(TEST_TAG, buf_payload, 32, ESP_LOG_INFO);

    FramePayload* msg_payload2;
    msg_payload2 = frame_payload__unpack(NULL, len_payload, buf_payload);
    if (msg_payload2 == NULL) {
        ESP_LOGE(TEST_TAG, "error unpacking incoming frame_payload__unpack");
        
    } else {

        ESP_LOGI(TEST_TAG, "Deserialized msg_payload2: data:%d" PRIi32, 
            (int)msg_payload2->test1_data->test_data);
    }
            // test END

        // 1. SYNTHESIZE: Initialize using the generated INIT macro
    FrameHeader header_fixture = FRAME_HEADER__INIT;
    
    // Assign values to your required fields
    header_fixture.next_message_size = 1684;         // Example payload size
    header_fixture.crc               = 0xDEADBEEF;  // Example CRC32

    // 2. PACK: Calculate size and serialize
    size_t len_header = frame_header__get_packed_size(&header_fixture);
    
    uint8_t *buf_header = (uint8_t *)malloc(32);

    if (buf_header == NULL) {
        ESP_LOGE(TEST_TAG, "Failed to allocate memory for packed header");
        return;
    }
        memset(buf_header, 0, 32);

    
    frame_header__pack(&header_fixture, buf_header);
    ESP_LOGI(TEST_TAG, "Successfully packed FrameHeader into %zu bytes", len_header);
    ESP_LOG_BUFFER_HEXDUMP(TEST_TAG, buf_header, 32, ESP_LOG_INFO);

    // 3. UNPACK: Verify the data was serialized correctly
    FrameHeader *unpacked_header = frame_header__unpack(NULL, len_header, buf_header);
    
    if (unpacked_header != NULL) {
        // Notice the use of PRIu32 and PRIX32 for safe 32-bit printing
        ESP_LOGI(TEST_TAG, "Unpacked successfully! Size: %" PRIu32 ", CRC: 0x%08" PRIX32, 
                 unpacked_header->next_message_size, 
                 unpacked_header->crc);
                 
        // Always free the unpacked message
        frame_header__free_unpacked(unpacked_header, NULL);
    } else {
        ESP_LOGE(TEST_TAG, "Failed to unpack the FrameHeader buf_header");
    }

    // Free the packed byte buf_header
    free(buf_header);
    free(buf_payload);
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

            // test_pack();
            
            deserialize(data, rxBytes);
            
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
    // void *buf_payload;
    // unsigned len_payload;

    // msgID.id = MESSAGE_TYPE__ALIVE_CHECK;

    // len_payload = message_id__get_packed_size(&msgID);
    // buf_payload = malloc(len_payload);
    // message_id__pack(&msgID, buf_payload);

    // ESP_LOGI(TAG, "Writing %d serialized bytes",
    //          len_payload);  // See the length of message
    // ESP_LOG_BUFFER_HEXDUMP(
    //     TAG, buf_payload, len_payload,
    //     ESP_LOG_INFO);  // Write to stdout to allow direct command line
    //     piping

    // ESP_LOGI(TAG, "start");

    // // Unpack the message using protobuf-c.
    // MessageID *msgID;
    // msgID = message_id__unpack(NULL, len_payload, buf_payload);
    // if (msgID == NULL) {
    //     ESP_LOGE(TAG, "error unpacking incoming message");
    // }

    // // display the message's fields.
    // ESP_LOGI(TAG, "deserialize: data=%d" PRIi32, msgID->id);  // required
    // field

    // // Free the allocated serialized buf_header
    // free(buf_payload);

    // // Free the allocated deserialized buf_header
    // message_id__free_unpacked(msgID, NULL);
}
