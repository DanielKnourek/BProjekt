#include "serial_link.h"
#include "program_mgr.h"
#include "pb_encode.h"
#include "pb_decode.h"
#include "flag_tools.h"
#include <string.h>

#define RX_BUFFER_SIZE 8192
static uint8_t rx_buffer[RX_BUFFER_SIZE];
static uint16_t rx_msg_size = 0;

static uint8_t process_buffer[RX_BUFFER_SIZE];
static uint16_t process_len = 0;
static uint16_t read_pos = 0;

#define TX_BUFFER_SIZE 25000 // Stream data can be up to ~22KB
static uint8_t tx_buffer[TX_BUFFER_SIZE];

static UART_HandleTypeDef *serial_huart = NULL;

void SerialLink_Init(UART_HandleTypeDef *huart) {
    serial_huart = huart;
    HAL_UARTEx_ReceiveToIdle_DMA(serial_huart, rx_buffer, RX_BUFFER_SIZE);
    __HAL_DMA_DISABLE_IT(serial_huart->hdmarx, DMA_IT_HT); // Disable Half Transfer Interrupt
}

void SerialLink_RxEventCallback(UART_HandleTypeDef *huart, uint16_t Size) {
    if (huart == serial_huart) {
        rx_msg_size = Size;
        set_flag(&Flags, FT_ACTION_RECIEVE);
    }
}

void SerialLink_ErrorCallback(UART_HandleTypeDef *huart) {
    if (huart == serial_huart) {
        // Restart reception on error (e.g. Overrun Error from debugger)
        HAL_UARTEx_ReceiveToIdle_DMA(serial_huart, rx_buffer, RX_BUFFER_SIZE);
        __HAL_DMA_DISABLE_IT(serial_huart->hdmarx, DMA_IT_HT);
    }
}

static void SerialLink_SendPayload(FramePayload *payload) {
    if (!serial_huart) return;

    // Ensure previous transmission is complete before writing to tx_buffer!
    while (serial_huart->gState != HAL_UART_STATE_READY) {}

    static FrameHeader header;
    header = (FrameHeader)FrameHeader_init_default;
    
    // Calculate the size of the encoded payload
    size_t payload_length = 0;
    pb_get_encoded_size(&payload_length, FramePayload_fields, payload);
    header.next_message_size = payload_length;
    header.crc = 0; 

    pb_ostream_t stream = pb_ostream_from_buffer(tx_buffer, sizeof(tx_buffer));
    
    bool status = pb_encode(&stream, FrameHeader_fields, &header);
    if (status) {
        status = pb_encode(&stream, FramePayload_fields, payload);
    }

    if (status) {
        HAL_UART_Transmit_DMA(serial_huart, tx_buffer, stream.bytes_written);
    }
}

void SerialLink_SendTestIntData(int32_t value) {
    static FramePayload payload;
    payload = (FramePayload)FramePayload_init_default;
    payload.which_payload = FramePayload_test_int_data_tag;
    payload.payload.test_int_data.value = value;
    SerialLink_SendPayload(&payload);
}

void SerialLink_SendTestBandwidthData(uint8_t *data, size_t size) {
    static FramePayload payload;
    payload = (FramePayload)FramePayload_init_default;
    payload.which_payload = FramePayload_test_bandwidth_data_tag;
    
    if (size > sizeof(payload.payload.test_bandwidth_data.dummy_data.bytes)) {
        size = sizeof(payload.payload.test_bandwidth_data.dummy_data.bytes);
    }
    
    payload.payload.test_bandwidth_data.dummy_data.size = size;
    memcpy(payload.payload.test_bandwidth_data.dummy_data.bytes, data, size);
    
    SerialLink_SendPayload(&payload);
}

void SerialLink_SendStreamData(int32_t *adc_values, size_t adc_count, int32_t *dac_values, size_t dac_count) {
    static FramePayload payload;
    payload = (FramePayload)FramePayload_init_default;
    payload.which_payload = FramePayload_stream_data_tag;
    
    // limit choosen by protocol
    if (adc_count > 1000) adc_count = 1000;
    if (dac_count > 1000) dac_count = 1000;
    
    payload.payload.stream_data.adc_values_count = adc_count;
    for (size_t i = 0; i < adc_count; i++) {
        payload.payload.stream_data.adc_values[i] = adc_values[i];
    }
    
    payload.payload.stream_data.dac_values_count = dac_count;
    for (size_t i = 0; i < dac_count; i++) {
        payload.payload.stream_data.dac_values[i] = dac_values[i];
    }
    
    SerialLink_SendPayload(&payload);
}

void SerialLink_Process(void) {
    if (is_set(&Flags, FT_ACTION_RECIEVE)) {
        reset_flag(&Flags, FT_ACTION_RECIEVE);

        // 1. Extract newly received bytes from the circular DMA buffer
        uint16_t write_pos = rx_msg_size;
        uint16_t bytes_available;
        if (write_pos >= read_pos) {
            bytes_available = write_pos - read_pos;
        } else {
            bytes_available = RX_BUFFER_SIZE - read_pos + write_pos;
        }

        while (bytes_available > 0) {
            if (process_len < RX_BUFFER_SIZE) {
                process_buffer[process_len++] = rx_buffer[read_pos];
            }
            read_pos++;
            if (read_pos >= RX_BUFFER_SIZE) {
                read_pos = 0;
            }
            bytes_available--;
        }

        // 2. Parse all complete messages in the linear buffer
        uint16_t parse_index = 0;
        while (parse_index + 10 <= process_len) {
            pb_istream_t header_stream = pb_istream_from_buffer(&process_buffer[parse_index], 10);
            FrameHeader header = FrameHeader_init_zero;
            bool status = pb_decode(&header_stream, FrameHeader_fields, &header);

            if (!status || header.next_message_size > TX_BUFFER_SIZE) {
                // Invalid header or unsynced, skip 1 byte to try resyncing
                parse_index++;
                continue;
            }

            if (parse_index + 10 + header.next_message_size <= process_len) {
                // We have a full payload, decode it
                pb_istream_t payload_stream = pb_istream_from_buffer(&process_buffer[parse_index + 10], header.next_message_size);
                
                static FramePayload payload;
                payload = (FramePayload)FramePayload_init_default;
                
                status = pb_decode(&payload_stream, FramePayload_fields, &payload);

                if (status) {
                    if (payload.which_payload == FramePayload_test_int_config_tag) {
                        ProgramMgr_SetTestIntConfig(&payload.payload.test_int_config);
                    } 
                    else if (payload.which_payload == FramePayload_test_bandwidth_config_tag) {
                        ProgramMgr_SetTestBandwidthConfig(&payload.payload.test_bandwidth_config);
                    }
                    else if (payload.which_payload == FramePayload_test_bandwidth_data_tag) {
                        ProgramMgr_HandleTestBandwidthData(&payload.payload.test_bandwidth_data);
                    }
                    else if (payload.which_payload == FramePayload_stream_config_tag) {
                        ProgramMgr_SetStreamConfig(&payload.payload.stream_config);
                    }
                }

                parse_index += 10 + header.next_message_size;
            } else {
                // Not enough bytes for the payload yet, wait for next interrupt
                break;
            }
        }

        // 3. Shift any leftover unparsed bytes to the front of the buffer
        if (parse_index > 0) {
            process_len -= parse_index;
            memmove(process_buffer, &process_buffer[parse_index], process_len);
        }
    }
}
