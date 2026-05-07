#pragma once

#include "messenger.pb-c.h"
#include "protobuf-c/protobuf-c.h"
#include <stdbool.h>
#include <stdint.h>
#include <stddef.h>

void start_uart_link(void);

// Actions to STM32
void send_test_int_config(bool enable);
void send_test_bandwidth_config(bool enable, uint32_t payload_size);
void send_stream_config(bool enable, uint32_t sample_rate_hz, uint32_t samples_per_frame);

// Callback for stream data
typedef void (*stream_adc_cb_t)(const int32_t *adc_values, size_t n_adc_values);
void serial_link_set_stream_adc_cb(stream_adc_cb_t cb);
