#pragma once

#include "messenger.pb-c.h"
#include "protobuf-c/protobuf-c.h"
#include <stdbool.h>

void start_uart_link(void);

// Actions to STM32
void send_test_int_config(bool enable);
void send_test_bandwidth_config(bool enable, uint32_t payload_size);
void send_stream_config(bool enable);
