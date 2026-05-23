#pragma once

#include <esp_http_server.h>
#include <stdio.h>
#include <stdint.h>

#include "freertos/FreeRTOS.h"

void web_server_start();
void web_server_push_adc_values(const int32_t *adc_values, size_t n_adc_values);
