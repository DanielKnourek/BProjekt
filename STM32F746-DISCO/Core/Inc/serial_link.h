#ifndef SERIAL_LINK_H
#define SERIAL_LINK_H

#include <stdint.h>
#include "main.h"
#include "messenger.pb.h"

void SerialLink_Init(UART_HandleTypeDef *huart);
void SerialLink_Process(void);
void SerialLink_RxEventCallback(UART_HandleTypeDef *huart, uint16_t Size);
void SerialLink_ErrorCallback(UART_HandleTypeDef *huart);

void SerialLink_SendTestIntData(int32_t value);
void SerialLink_SendTestBandwidthData(uint8_t *data, size_t size);
void SerialLink_SendStreamData(int32_t *adc_values, size_t adc_count, int32_t *dac_values, size_t dac_count);

#endif
