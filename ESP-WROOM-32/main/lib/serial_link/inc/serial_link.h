#pragma once

#include "messenger.pb-c.h"
#include "protobuf-c/protobuf-c.h"
#include <stdbool.h>

void start_uart_link(void);

// Actions to STM32
void send_action_program1(bool enable);
void send_action_program2(bool enable);
void send_action_program3(int32_t val);
