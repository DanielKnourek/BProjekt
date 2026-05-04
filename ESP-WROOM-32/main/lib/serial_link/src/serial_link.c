#include "serial_link.h"

#include "driver/uart.h"
// #include "driver/gpio.h"
// #include "string.h"
#include <string.h>

#include "esp_log.h"
#include "esp_rom_crc.h"
#include <inttypes.h>

static const char* TAG = "serial_link.c";

static const int RX_BUF_SIZE = 128;

#define TXD_PIN (CONFIG_UART_GPIO_TX)
#define RXD_PIN (CONFIG_UART_GPIO_RX)

#define __AUTO_FREE_MSG__ __attribute__((cleanup(auto_free_message)))

/*
 * @note Cleanup function for ProtobufCMessage pointers.
 *       It will automatically free the memory allocated for a ProtobufCMessage
 * when the variable goes out of scope.
 */
static inline void auto_free_message(void* ptr) {
    // Cast the generic void* back to a pointer-to-a-ProtobufCMessage-pointer
    ProtobufCMessage** msg_ptr = (ProtobufCMessage**)ptr;

    if (msg_ptr != NULL && *msg_ptr != NULL) {
        ESP_LOGD("CLEANUP", "Automatically freeing message of type %s.",
                 (*msg_ptr)->descriptor->name);
        // Use the universal protobuf-c free function!
        protobuf_c_message_free_unpacked(*msg_ptr, NULL);
        *msg_ptr = NULL;  // Nullify to prevent dangling pointers
    }
}

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

/* @note Caller is responsible for calling frame_payload__free_unpacked() on the
 * returned pointer.
 *
 *   use __AUTO_FREE_MSG__ to automatically free the message when it goes out of
 * scope, or call frame_payload__free_unpacked() manually when done with the
 * message.
 */
static void send_frame(FramePayload* payload) {
    FrameHeader header = FRAME_HEADER__INIT;
    size_t payload_size = frame_payload__get_packed_size(payload);
    uint8_t* payload_buf = malloc(payload_size);
    if (!payload_buf) {
        ESP_LOGE(TAG, "Failed to allocate memory for payload");
        free(payload_buf);
        return;
    }
        

    frame_payload__pack(payload, payload_buf);

    header.next_message_size = payload_size;
    header.crc = esp_rom_crc32_le(0, payload_buf, payload_size);

    size_t header_size = frame_header__get_packed_size(&header);
    uint8_t* total_buf = malloc(header_size + payload_size);
    if (!total_buf) {
        ESP_LOGE(TAG, "Failed to allocate memory for transmiting frame buffer");
        free(payload_buf);
        return;
    }

    frame_header__pack(&header, total_buf);
    memcpy(total_buf + header_size, payload_buf, payload_size);

    int txBytes = uart_write_bytes(UART_NUM_1, total_buf, header_size + payload_size);


    ESP_LOGI(TAG, "Sent frame: header_size=%zu, payload_size=%zu, crc=0x%08" PRIx32,
             header_size, payload_size, header.crc);
    ESP_LOGI(TAG, "Bytes sent: %d", txBytes);

    free(payload_buf);
    free(total_buf);
}

void send_action_program1(bool enable) {
    FramePayload payload = FRAME_PAYLOAD__INIT;
    Test1Options options = TEST1_OPTIONS__INIT;
    options.enable = enable;
    payload.payload_case = FRAME_PAYLOAD__PAYLOAD_TEST1_OPTIONS;
    payload.test1_options = &options;
    send_frame(&payload);
}

void send_action_program2(bool enable) {
    FramePayload payload = FRAME_PAYLOAD__INIT;
    Sensor1Options options = SENSOR1_OPTIONS__INIT;
    options.enable = enable;
    payload.payload_case = FRAME_PAYLOAD__PAYLOAD_SENSOR1_OPTIONS;
    payload.sensor1_options = &options;
    send_frame(&payload);
}

void send_action_program3(int32_t val) {
    FramePayload payload = FRAME_PAYLOAD__INIT;
    Test1Data data = TEST1_DATA__INIT;
    data.test_data = val;
    payload.payload_case = FRAME_PAYLOAD__PAYLOAD_TEST1_DATA;
    payload.test1_data = &data;
    send_frame(&payload);
    
}

/* @note Caller is responsible for calling frame_payload__free_unpacked() on the
 * returned pointer.
 *
 *   use __AUTO_FREE_MSG__ to automatically free the message when it goes out of
 * scope, or call frame_payload__free_unpacked() manually when done with the
 * message.
 */
FramePayload* create_frame_payload(uint8_t* data, size_t rxBytes) {
    // create_frame_payload pb
    //  -- read FrameHeader FIRST to know the type of message, then read the
    //  rest of the data accordingly

    // TODO: len_header could be made static const to avoid recomputing the size
    // every time, but this is just a test for now
    unsigned len_header =
        frame_header__get_packed_size(&(FrameHeader)FRAME_HEADER__INIT);
    __AUTO_FREE_MSG__ FrameHeader* msg_header =
        frame_header__unpack(NULL, len_header, data);
    if (msg_header == NULL) {
        ESP_LOGE(TAG, "error unpacking incoming message_id__unpack");
        return NULL;
    }

    // display the message's fields. TODO: remove after testing
    ESP_LOGI(TAG, "create_frame_payload header: size=%d; crc:0x%08x",
             (int)msg_header->next_message_size, (unsigned int)msg_header->crc);

    if (len_header + msg_header->next_message_size > rxBytes) {
        ESP_LOGE(TAG, "Not enough data for FramePayload");
        return NULL;
    }

    uint8_t* payload_ptr = data + len_header;
    uint32_t cal_crc = esp_rom_crc32_le(0, payload_ptr, msg_header->next_message_size);
    if (cal_crc != msg_header->crc) {
        ESP_LOGE(TAG, "CRC mismatch: expected 0x%08x, got 0x%08x",
                 (unsigned int)msg_header->crc, (unsigned int)cal_crc);
        return NULL;
    }

    FramePayload* msg_payload = frame_payload__unpack(
        NULL, msg_header->next_message_size, payload_ptr);

    if (msg_payload == NULL) {
        ESP_LOGE(TAG, "error unpacking FramePayload");
        return NULL;
    }

    // display the message's fields based on type
    switch (msg_payload->payload_case) {
        case FRAME_PAYLOAD__PAYLOAD_TEST1_DATA:
            ESP_LOGI(TAG, "Payload: Test1Data = %" PRIi32,
                     msg_payload->test1_data->test_data);
            break;
        case FRAME_PAYLOAD__PAYLOAD_TEST1_OPTIONS:
            ESP_LOGI(TAG, "Payload: Test1Options = %s",
                     msg_payload->test1_options->enable ? "true" : "false");
            break;
        case FRAME_PAYLOAD__PAYLOAD_SENSOR1_DATA:
            ESP_LOGI(TAG, "Payload: Sensor1Data = %" PRIi32,
                     msg_payload->sensor1_data->sensor1_data);
            break;
        case FRAME_PAYLOAD__PAYLOAD_SENSOR1_OPTIONS:
            ESP_LOGI(TAG, "Payload: Sensor1Options = %s",
                     msg_payload->sensor1_options->enable ? "true" : "false");
            break;
        default:
            ESP_LOGW(TAG, "Payload: Unknown case %d", msg_payload->payload_case);
            break;
    }

    return msg_payload;
}

static void rx_task(void* arg) {
    static const char* RX_TASK_TAG = "RX_TASK";
    esp_log_level_set(RX_TASK_TAG, ESP_LOG_INFO);
    ESP_LOGI(RX_TASK_TAG, "---- Recieving new data ----");

    uint8_t* data = (uint8_t*)malloc(RX_BUF_SIZE + 1);
    while (1) {
        const int rxBytes = uart_read_bytes(UART_NUM_1, data, RX_BUF_SIZE,
                                            1000 / portTICK_PERIOD_MS);
        if (rxBytes > 0) {
            data[rxBytes] = 0;

            // TODO: remove after testing
            ESP_LOGI(RX_TASK_TAG, "Read %d bytes: '%s' |1ca5c|", rxBytes,
                     (char*)data);
            ESP_LOG_BUFFER_HEXDUMP(RX_TASK_TAG, data, rxBytes, ESP_LOG_INFO);

            __AUTO_FREE_MSG__ FramePayload* recieved_data =
                create_frame_payload(data, rxBytes);
            if (recieved_data) {
                ESP_LOGI(RX_TASK_TAG, "Successfully processed message");
            }
        }
    }
    free(data);
}

void uart_init(void) {
    init();
    // TODO: document - there was not enough memory for the task
    xTaskCreate(rx_task, "uart_rx_task", 1024 * 4, NULL,
                configMAX_PRIORITIES - 1, NULL);
    // xTaskCreate(tx_task, "uart_tx_task", 1024 * 2, NULL,
    //             configMAX_PRIORITIES - 2, NULL);
}

void start_uart_link(void) { uart_init(); }
