/* Blink Example

   This example code is in the Public Domain (or CC0 licensed, at your option.)

   Unless required by applicable law or agreed to in writing, this
   software is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
   CONDITIONS OF ANY KIND, either express or implied.
*/
#include <stdio.h>

#include "driver/gpio.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "sdkconfig.h"

// Custom components
#include "net_con.h"
#include "web_server.h"

/* Can use project configuration menu (idf.py menuconfig) to choose the GPIO to
   blink, or you can edit the following line and set a number here.
*/
#define BLINK_GPIO CONFIG_BLINK_GPIO

void app_main(void) {
    /* Configure the IOMUX register for pad BLINK_GPIO (some pads are
       muxed to GPIO on reset already, but some default to other
       functions and need to be switched to GPIO. Consult the
       Technical Reference for a list of pads and their default
       functions.)
    */
    gpio_pad_select_gpio(BLINK_GPIO);
    gpio_set_direction(BLINK_GPIO, GPIO_MODE_OUTPUT);
    gpio_set_level(BLINK_GPIO, 1);
    init_test();
    net_con_init();
    web_server_start();

    gpio_set_level(BLINK_GPIO, 0);
   //  /* Set the GPIO as a push/pull output */
   //  while (1) {
   //      /* Blink off (output low) */
   //      printf("Turning off the LED\n");
   //      gpio_set_level(BLINK_GPIO, 0);
   //      vTaskDelay(10000 / portTICK_PERIOD_MS);
   //      /* Blink on (output high) */
   //      printf("Turning on the LED\n");
   //      gpio_set_level(BLINK_GPIO, 1);
   //      vTaskDelay(50 / portTICK_PERIOD_MS);
   //  }
}