#include "serial_link.h"

#include "driver/uart.h"
// #include "driver/gpio.h"
// #include "string.h"
#include <string.h>

#include "esp_log.h"
#include "esp_rom_crc.h"
#include "messenger.pb-c.h"
#include <inttypes.h>

static stream_adc_cb_t g_stream_adc_cb = NULL;

static bandwidth_stats_t g_bw_stats = {0};
static bool g_bw_running = false;

void serial_link_set_stream_adc_cb(stream_adc_cb_t cb) {
    g_stream_adc_cb = cb;
}

static const char* TAG = "serial_link.c";

static const int RX_BUF_SIZE = 2048;

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

    if(payload->payload_case != FRAME_PAYLOAD__PAYLOAD_TEST_BANDWIDTH_DATA) {
        ESP_LOGI(TAG, "Sent frame: header_size=%zu, payload_size=%zu, crc=0x%08" PRIx32,
             header_size, payload_size, header.crc);
             ESP_LOGI(TAG, "Bytes sent: %d", txBytes);
    }

    free(payload_buf);
    free(total_buf);
}

void send_test_int_config(bool enable) {
    FramePayload payload = FRAME_PAYLOAD__INIT;
    TestIntConfig config = TEST_INT_CONFIG__INIT;
    config.enable = enable;
    payload.payload_case = FRAME_PAYLOAD__PAYLOAD_TEST_INT_CONFIG;
    payload.test_int_config = &config;
    send_frame(&payload);
}

void send_test_bandwidth_config(bool enable, uint32_t payload_size) {
    // 1. Send the config to STM32
    FramePayload config_payload = FRAME_PAYLOAD__INIT;
    TestBandwidthConfig config = TEST_BANDWIDTH_CONFIG__INIT;
    config.enable = enable;
    if (payload_size > 0) {
        config.has_payload_size = 1;
        config.payload_size = payload_size;
    }
    config_payload.payload_case = FRAME_PAYLOAD__PAYLOAD_TEST_BANDWIDTH_CONFIG;
    config_payload.test_bandwidth_config = &config;
    send_frame(&config_payload);

    // 2. initial bandwith test state
    if (enable) {
        g_bw_running = true;
        serial_link_reset_bandwidth_stats();
        
        // Send the initial trigger frame
        uint32_t size = payload_size > 0 ? payload_size : 1024;
        uint8_t* dummy = malloc(size);
        if (dummy) {
            memset(dummy, 0xAA, size);
            FramePayload data_payload = FRAME_PAYLOAD__INIT;
            TestBandwidthData data = TEST_BANDWIDTH_DATA__INIT;
            data.dummy_data.data = dummy;
            data.dummy_data.len = size;
            data_payload.payload_case = FRAME_PAYLOAD__PAYLOAD_TEST_BANDWIDTH_DATA;
            data_payload.test_bandwidth_data = &data;
            
            ESP_LOGI(TAG, "Starting bandwith test with initial %" PRIu32 " byte frame", size);
            send_frame(&data_payload);
            g_bw_stats.sent++;
            free(dummy);
        }
    } else {
        g_bw_running = false;
        ESP_LOGI(TAG, "Bandwidth bandwith test stopped");
    }
}

void send_stream_config(bool enable, uint32_t sample_rate_hz, uint32_t samples_per_frame) {
    FramePayload payload = FRAME_PAYLOAD__INIT;
    StreamConfig config = STREAM_CONFIG__INIT;
    config.enable = enable;
    if (sample_rate_hz > 0) {
        config.has_sample_rate_hz = 1;
        config.sample_rate_hz = sample_rate_hz;
    }
    if (samples_per_frame > 0) {
        config.has_samples_per_frame = 1;
        config.samples_per_frame = samples_per_frame;
    }
    payload.payload_case = FRAME_PAYLOAD__PAYLOAD_STREAM_CONFIG;
    payload.stream_config = &config;
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

    static unsigned len_header = 0;
    if (len_header == 0) {
        len_header = frame_header__get_packed_size(&(FrameHeader)FRAME_HEADER__INIT);
    }
    __AUTO_FREE_MSG__ FrameHeader* msg_header =
        frame_header__unpack(NULL, len_header, data);
    if (msg_header == NULL) {
        ESP_LOGE(TAG, "error unpacking incoming message_id__unpack");
        return NULL;
    }

    // display the message's fields. TODO: remove after testing
    ESP_LOGD(TAG, "create_frame_payload header: size=%d; crc:0x%08x",
             (int)msg_header->next_message_size, (unsigned int)msg_header->crc);

    if (len_header + msg_header->next_message_size > rxBytes) {
        ESP_LOGE(TAG, "Not enough data for FramePayload");
        return NULL;
    }

    uint8_t* payload_ptr = data + len_header;
    uint32_t cal_crc = esp_rom_crc32_le(0, payload_ptr, msg_header->next_message_size);
    if (msg_header->crc == 0) {
        ESP_LOGD(TAG, "CRC is not set");
    } else if (cal_crc != msg_header->crc) {
        ESP_LOGE(TAG, "CRC mismatch: expected 0x%08x, got 0x%08x",
                 (unsigned int)cal_crc, (unsigned int)msg_header->crc);
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
        case FRAME_PAYLOAD__PAYLOAD_TEST_INT_DATA:
            ESP_LOGI(TAG, "Payload: TestIntData = %" PRIi32,
                     msg_payload->test_int_data->value);
            break;
        case FRAME_PAYLOAD__PAYLOAD_TEST_INT_CONFIG:
            ESP_LOGI(TAG, "Payload: TestIntConfig = %s",
                     msg_payload->test_int_config->enable ? "true" : "false");
            break;
        case FRAME_PAYLOAD__PAYLOAD_TEST_BANDWIDTH_DATA:
            g_bw_stats.received++;
            if (g_bw_running) {
                // bandwith test: Echo the frame back immediately
                send_frame(msg_payload);
                g_bw_stats.sent++;
            }
            ESP_LOGD(TAG, "Payload: TestBandwidthData dummy bytes = %zu (total rec:%" PRIu32 ")",
                     msg_payload->test_bandwidth_data->dummy_data.len, g_bw_stats.received);
            break;
        case FRAME_PAYLOAD__PAYLOAD_TEST_BANDWIDTH_CONFIG:
            ESP_LOGI(TAG, "Payload: TestBandwidthConfig = %s",
                     msg_payload->test_bandwidth_config->enable ? "true" : "false");
            break;
        case FRAME_PAYLOAD__PAYLOAD_STREAM_DATA: {
            static int print_count = 0;
            static size_t byte_count = 0;
            byte_count += frame_payload__get_packed_size(msg_payload);
            print_count++;
            if (print_count % 50 == 1) {
            ESP_LOGI(TAG, "Recieved values: %zu x50, total bytes=%zu", msg_payload->stream_data->n_adc_values, byte_count);
            byte_count = 0;
            }
            // TODO: remove after testing, flooding the console, printing recived values
            // static uint32_t stream_msg_count = 0;
            // stream_msg_count++;
            // // Only log 1 in every 50 messages to prevent flooding the console and triggering the watchdog
            // if (stream_msg_count % 50 == 1) {
            //     ESP_LOGI(TAG, "Payload: StreamData with %zu ADCs, %zu DACs (msg #%" PRIu32 ")",
            //              msg_payload->stream_data->n_adc_values, msg_payload->stream_data->n_dac_values, stream_msg_count);
                
            //     if (msg_payload->stream_data->n_adc_values > 0) {
            //         char val_buf[256] = {0};
            //         int offset = 0;
            //         for (size_t i = 0; i < msg_payload->stream_data->n_adc_values && i < 15; i++) {
            //             offset += snprintf(val_buf + offset, sizeof(val_buf) - offset, "%" PRIi32 " ", msg_payload->stream_data->adc_values[i]);
            //         }
            //         ESP_LOGI(TAG, "  ADC values: %s%s", val_buf, msg_payload->stream_data->n_adc_values > 15 ? "..." : "");
            //     }
            // }

            if (msg_payload->stream_data->n_adc_values > 0 && g_stream_adc_cb) {
                g_stream_adc_cb(msg_payload->stream_data->adc_values, msg_payload->stream_data->n_adc_values);
            }
            break;
        }
        case FRAME_PAYLOAD__PAYLOAD_STREAM_CONFIG:
            ESP_LOGI(TAG, "Payload: StreamConfig = %s",
                     msg_payload->stream_config->enable ? "true" : "false");
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

    size_t max_buffer_size = RX_BUF_SIZE * 2;
    uint8_t* buffer = (uint8_t*)malloc(max_buffer_size);
    size_t buffer_len = 0;

    static unsigned len_header = 0;
    if (len_header == 0) {
        len_header = frame_header__get_packed_size(&(FrameHeader)FRAME_HEADER__INIT);
    }

    size_t expected_frame_size = 0;

    while (1) {
        size_t available = 0;
        uart_get_buffered_data_len(UART_NUM_1, &available);
        
        size_t to_read = max_buffer_size - buffer_len;
        if (to_read > 0) {
            size_t target_read = 1;
            if (available > 0) {
                target_read = available;
            } else {
                if (expected_frame_size > buffer_len) {
                    target_read = expected_frame_size - buffer_len;
                } else if (buffer_len < len_header) {
                    target_read = len_header - buffer_len;
                }
            }
            to_read = target_read > to_read ? to_read : target_read;
        }

        const int rxBytes = uart_read_bytes(UART_NUM_1, buffer + buffer_len, 
                                            to_read, 1000 / portTICK_PERIOD_MS);
        if (rxBytes > 0) {
            buffer_len += rxBytes;

            while (buffer_len >= len_header) {
                FrameHeader* msg_header = frame_header__unpack(NULL, len_header, buffer);
                if (msg_header == NULL) {
                    // Unpacking failed, shift by 1 to resync
                    memmove(buffer, buffer + 1, buffer_len - 1);
                    buffer_len -= 1;
                    expected_frame_size = 0; // Reset expectation
                    continue;
                }

                size_t total_frame_size = len_header + msg_header->next_message_size;
                
                if (buffer_len >= total_frame_size) {
                    __AUTO_FREE_MSG__ FramePayload* recieved_data =
                        create_frame_payload(buffer, total_frame_size);
                    if (recieved_data) {
                        ESP_LOGD(RX_TASK_TAG, "Successfully processed message");
                    }
                    
                    memmove(buffer, buffer + total_frame_size, buffer_len - total_frame_size);
                    buffer_len -= total_frame_size;
                    frame_header__free_unpacked(msg_header, NULL);
                    expected_frame_size = 0; // Reset expectation for next frame
                } else {
                    // Not enough data for the full frame yet
                    expected_frame_size = total_frame_size; // Save so we can wait for exact bytes
                    frame_header__free_unpacked(msg_header, NULL);
                    break;
                }
            }

            if (buffer_len == max_buffer_size) {
                ESP_LOGE(RX_TASK_TAG, "Buffer full, dropping data to resync");
                buffer_len = 0;
                expected_frame_size = 0; // Reset
            }
        }
    }
    free(buffer);
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

void serial_link_get_bandwidth_stats(bandwidth_stats_t *stats) {
    if (stats) {
        *stats = g_bw_stats;
    }
}

void serial_link_reset_bandwidth_stats(void) {
    memset(&g_bw_stats, 0, sizeof(g_bw_stats));
}
